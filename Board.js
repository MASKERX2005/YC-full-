import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

// Maps each swimlane's state key to the status value stored on a client.
const SWIMLANE_STATUS = {
  backlog: 'backlog',
  inProgress: 'in-progress',
  complete: 'complete',
};

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    const clients = this.getClients();
    this.state = {
      clients: {
        backlog: clients.filter(client => !client.status || client.status === 'backlog'),
        inProgress: clients.filter(client => client.status && client.status === 'in-progress'),
        complete: clients.filter(client => client.status && client.status === 'complete'),
      }
    }
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    }
  }

  componentDidMount() {
    // Dragula treats every container passed to it as both a drop target and a
    // sortable list, so dragging a card up/down reorders it, and dragging it
    // into a different swimlane moves it there - exactly what the ticket asks for.
    const containers = [
      this.swimlanes.backlog.current,
      this.swimlanes.inProgress.current,
      this.swimlanes.complete.current,
    ];

    this.drake = Dragula(containers);

    this.drake.on('drop', (el, target, source) => {
      // Dragula has already physically moved `el` into `target` in the real DOM.
      // Read the new lane order now, while the DOM still shows exactly what the
      // user just did: the moved card present in `target`, absent from `source`.
      const newClients = this.readClientsFromDom();

      // React, however, still believes `el` belongs under `source` from its last
      // render. If we hand control back to React right now, its reconciliation
      // will try to remove `el` from `source`'s real DOM node and fail (it's not
      // there any more - Dragula already moved it), throwing a NotFoundError.
      // So: put the node back as a child of `source` first. React will then
      // successfully remove it from there and mount it fresh under `target`.
      if (source !== target) {
        source.appendChild(el);
      }

      this.setState({ clients: newClients });
    });
  }

  componentWillUnmount() {
    if (this.drake) {
      this.drake.destroy();
    }
  }

  readClientsFromDom() {
    const clientsById = {};
    Object.values(this.state.clients).forEach(lane => {
      lane.forEach(client => {
        clientsById[client.id] = client;
      });
    });

    const readLane = (containerRef, status) => {
      return Array.from(containerRef.current.children).map(cardNode => {
        const client = clientsById[cardNode.dataset.id];
        return { ...client, status };
      });
    };

    return {
      backlog: readLane(this.swimlanes.backlog, SWIMLANE_STATUS.backlog),
      inProgress: readLane(this.swimlanes.inProgress, SWIMLANE_STATUS.inProgress),
      complete: readLane(this.swimlanes.complete, SWIMLANE_STATUS.complete),
    };
  }

  getClients() {
    return [
      ['1','Stark, White and Abbott','Cloned Optimal Architecture', 'backlog'],
      ['2','Wiza LLC','Exclusive Bandwidth-Monitored Implementation', 'backlog'],
      ['3','Nolan LLC','Vision-Oriented 4Thgeneration Graphicaluserinterface', 'backlog'],
      ['4','Thompson PLC','Streamlined Regional Knowledgeuser', 'backlog'],
      ['5','Walker-Williamson','Team-Oriented 6Thgeneration Matrix', 'backlog'],
      ['6','Boehm and Sons','Automated Systematic Paradigm', 'backlog'],
      ['7','Runolfsson, Hegmann and Block','Integrated Transitional Strategy', 'backlog'],
      ['8','Schumm-Labadie','Operative Heuristic Challenge', 'backlog'],
      ['9','Kohler Group','Re-Contextualized Multi-Tasking Attitude', 'backlog'],
      ['10','Romaguera Inc','Managed Foreground Toolset', 'backlog'],
      ['11','Reilly-King','Future-Proofed Interactive Toolset', 'backlog'],
      ['12','Emard, Champlin and Runolfsdottir','Devolved Needs-Based Capability', 'backlog'],
      ['13','Fritsch, Cronin and Wolff','Open-Source 3Rdgeneration Website', 'backlog'],
      ['14','Borer LLC','Profit-Focused Incremental Orchestration', 'backlog'],
      ['15','Emmerich-Ankunding','User-Centric Stable Extranet', 'backlog'],
      ['16','Willms-Abbott','Progressive Bandwidth-Monitored Access', 'backlog'],
      ['17','Brekke PLC','Intuitive User-Facing Customerloyalty', 'backlog'],
      ['18','Bins, Toy and Klocko','Integrated Assymetric Software', 'backlog'],
      ['19','Hodkiewicz-Hayes','Programmable Systematic Securedline', 'backlog'],
      ['20','Murphy, Lang and Ferry','Organized Explicit Access', 'backlog'],
    ].map(companyDetails => ({
      id: companyDetails[0],
      name: companyDetails[1],
      description: companyDetails[2],
      status: companyDetails[3],
    }));
  }
  renderSwimlane(name, clients, ref) {
    return (
      <Swimlane name={name} clients={clients} dragulaRef={ref}/>
    );
  }

  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane('Backlog', this.state.clients.backlog, this.swimlanes.backlog)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('In Progress', this.state.clients.inProgress, this.swimlanes.inProgress)}
            </div>
            <div className="col-md-4">
              {this.renderSwimlane('Complete', this.state.clients.complete, this.swimlanes.complete)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
