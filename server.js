import express from 'express';
import Database from 'better-sqlite3';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  return res.status(200).send({'message': 'SHIPTIVITY API. Read documentation to see API docs'});
});

// We are keeping one connection alive for the rest of the life application for simplicity
const db = new Database('./clients.db');

// Don't forget to close connection when server gets terminated
const closeDb = () => db.close();
process.on('SIGTERM', closeDb);
process.on('SIGINT', closeDb);

/**
 * Validate id input
 * @param {any} id
 */
const validateId = (id) => {
  if (Number.isNaN(id)) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid id provided.',
      'long_message': 'Id can only be integer.',
      },
    };
  }
  const client = db.prepare('select * from clients where id = ? limit 1').get(id);
  if (!client) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid id provided.',
      'long_message': 'Cannot find client with that id.',
      },
    };
  }
  return {
    valid: true,
  };
}

/**
 * Validate priority input
 * @param {any} priority
 */
const validatePriority = (priority) => {
  // Number.isNaN only returns true for an actual NaN *number*, so a string
  // like "abc" sails straight past it (Number.isNaN("abc") === false) - it
  // has to be checked explicitly, or bad input silently corrupts a row.
  if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 1) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid priority provided.',
      'long_message': 'Priority can only be positive integer.',
      },
    };
  }
  return {
    valid: true,
  }
}

/**
 * Get all of the clients. Optional filter 'status'
 * GET /api/v1/clients?status={status} - list all clients, optional parameter status: 'backlog' | 'in-progress' | 'complete'
 */
app.get('/api/v1/clients', (req, res) => {
  const status = req.query.status;
  if (status) {
    // status can only be either 'backlog' | 'in-progress' | 'complete'
    if (status !== 'backlog' && status !== 'in-progress' && status !== 'complete') {
      return res.status(400).send({
        'message': 'Invalid status provided.',
        'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].',
      });
    }
    const clients = db.prepare('select * from clients where status = ?').all(status);
    return res.status(200).send(clients);
  }
  const statement = db.prepare('select * from clients');
  const clients = statement.all();
  return res.status(200).send(clients);
});

/**
 * Get a client based on the id provided.
 * GET /api/v1/clients/{client_id} - get client by id
 */
app.get('/api/v1/clients/:id', (req, res) => {
  const id = parseInt(req.params.id , 10);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    res.status(400).send(messageObj);
  }
  return res.status(200).send(db.prepare('select * from clients where id = ?').get(id));
});

/**
 * Update client information based on the parameters provided.
 * When status is provided, the client status will be changed
 * When priority is provided, the client priority will be changed with the rest of the clients accordingly
 * Note that priority = 1 means it has the highest priority (should be on top of the swimlane).
 * No client on the same status should not have the same priority.
 * This API should return list of clients on success
 *
 * PUT /api/v1/clients/{client_id} - change the status of a client
 *    Data:
 *      status (optional): 'backlog' | 'in-progress' | 'complete',
 *      priority (optional): integer,
 *
 */
app.put('/api/v1/clients/:id', (req, res) => {
  const id = parseInt(req.params.id , 10);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    return res.status(400).send(messageObj);
  }

  let { status, priority } = req.body;

  if (status !== undefined && status !== 'backlog' && status !== 'in-progress' && status !== 'complete') {
    return res.status(400).send({
      'message': 'Invalid status provided.',
      'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].',
    });
  }

  if (priority !== undefined) {
    const { valid: priorityValid, messageObj: priorityMessageObj } = validatePriority(priority);
    if (!priorityValid) {
      return res.status(400).send(priorityMessageObj);
    }
  }

  /* ---------- Update code below ----------*/

  // How many clients currently sit in a given status column.
  const countInStatus = (clientStatus) =>
    db.prepare('select count(*) as count from clients where status = ?').get(clientStatus).count;

  // Everything below runs as one transaction: either the whole reorder/move
  // (and every priority shift it requires) is committed, or none of it is -
  // so a refresh can never see a half-updated board.
  const moveClient = db.transaction(() => {
    const client = db.prepare('select * from clients where id = ?').get(id);
    const oldStatus = client.status;
    const oldPriority = client.priority;
    const newStatus = status !== undefined ? status : oldStatus;

    if (newStatus === oldStatus) {
      // Same swimlane: this is a reorder (dragging a card up or down).
      if (priority === undefined || priority === oldPriority) {
        return; // nothing actually changed
      }
      // Can't ask for a priority beyond how many clients are in this lane.
      const maxPriority = countInStatus(oldStatus);
      const targetPriority = Math.max(1, Math.min(priority, maxPriority));

      if (targetPriority > oldPriority) {
        // Moving down the list: everyone strictly between the old and new
        // spot shifts up by one to close the gap left behind.
        db.prepare(
          'update clients set priority = priority - 1 where status = ? and priority > ? and priority <= ?'
        ).run(oldStatus, oldPriority, targetPriority);
      } else {
        // Moving up the list: everyone from the new spot up to (but not
        // including) the old spot shifts down by one to make room.
        db.prepare(
          'update clients set priority = priority + 1 where status = ? and priority >= ? and priority < ?'
        ).run(oldStatus, targetPriority, oldPriority);
      }
      db.prepare('update clients set priority = ? where id = ?').run(targetPriority, id);
    } else {
      // Different swimlane: dragging the card into another column.
      // First close the gap this client leaves behind in its old column...
      db.prepare(
        'update clients set priority = priority - 1 where status = ? and priority > ?'
      ).run(oldStatus, oldPriority);

      // ...then place it in the new column: at the requested priority if one
      // was given (shifting everyone at/after that spot down to make room),
      // or at the bottom of the column if no priority was given at all.
      const maxInNewStatus = countInStatus(newStatus);
      let targetPriority;
      if (priority === undefined) {
        targetPriority = maxInNewStatus + 1;
      } else {
        targetPriority = Math.max(1, Math.min(priority, maxInNewStatus + 1));
        db.prepare(
          'update clients set priority = priority + 1 where status = ? and priority >= ?'
        ).run(newStatus, targetPriority);
      }

      db.prepare(
        'update clients set status = ?, priority = ? where id = ?'
      ).run(newStatus, targetPriority, id);
    }
  });

  moveClient();

  const clients = db.prepare('select * from clients').all();
  return res.status(200).send(clients);
});

app.listen(3001);
console.log('app running on port ', 3001);
