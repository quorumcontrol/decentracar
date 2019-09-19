import React, { useState } from 'react';
import 'react-bulma-components/dist/react-bulma-components.min.css';
import './App.css';
import { Map, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { getAppCommunity } from './decentracar/util/appcommunity';
import { Simulation } from './decentracar/simulation'
import { Icon, Point } from 'leaflet'
import { Driver } from './decentracar/driver';
import { Rider } from './decentracar/rider';
import { Container, Button, Columns, Navbar, Content, Box, Media, Image } from 'react-bulma-components';
import {logs} from './decentracar/util/emittinglogger';

const position: [number, number] = [52.491362, 13.362029];

const driverPng:any = require('./imgs/driver.png')
const riderPng:any = require('./imgs/rider.png')

const driverIcon = new Icon({
  iconUrl: driverPng,
  iconRetinaUrl: driverPng,
  iconSize: new Point(30, 30),
  className: 'leaflet-div-icon'
});

const riderIcon = new Icon({
  iconUrl: riderPng,
  iconRetinaUrl: riderPng,
  iconSize: new Point(30, 30),
  className: 'leaflet-div-icon'
})

const DriverMarker = ({ driver }: { driver: Driver }) => {
  return (
    <Marker position={[driver.location.y, driver.location.x]} icon={driverIcon}>
      <Popup>
        A Driver: {driver.name}
        Accepted Rider: {driver.acceptedRider}
      </Popup>
      <Tooltip>{driver.name}</Tooltip>
    </Marker>
  )
}

const RiderMarker = ({ rider }: { rider: Rider }) => {
  return (
    <Marker position={[rider.location.y, rider.location.x]} icon={riderIcon}>
      <Popup>A Rider: {rider.name}</Popup>
      <Tooltip>{rider.name}</Tooltip>
    </Marker>
  )
}

const SimulationDisplay = ({ simulation, logs }: { simulation: Simulation, logs:JSX.Element[] }) => {
  let markers: JSX.Element[] = []
  for (let d of simulation.drivers) {
    markers.push(<DriverMarker key={d.name} driver={d} />)
  }

  for (let r of simulation.riders) {
    markers.push(<RiderMarker key={r.name} rider={r} />)
  }


  return (
    <Columns>
      <Columns.Column size={"half"}>
        <Map zoom={12} center={position}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
          />
          {markers}
        </Map>
      </Columns.Column>
      <Columns.Column>
        <Content className="app-logs">
          <h2>Events</h2>
          <div>
            {logs}
          </div>
        </Content>
      </Columns.Column>
    </Columns>
  )
}


const LogDisplay = ({txt,icon}:{txt:string,icon:any}) => {
  return (
    <Box key={txt}>
      <Media>
        <Media.Item>
         <Image size={32} src={icon}></Image>
        </Media.Item>
        <Media.Item>
          <Content>
          <p>{txt}</p>
          </Content>
        </Media.Item>
      </Media>
    </Box>
  )
}

const App: React.FC = () => {

  const [simulation, setSimulation] = useState(null as null | Simulation)
  const [appLogs, setAppLogs] = useState([] as JSX.Element[])
  const [tick, setTick] = useState(0)

  const handleStart = async () => {
    const sim = new Simulation({
      community: getAppCommunity(),
      driverCount: 10,
      riderProbability: 5,
    })

    sim.on('tick', (num) => {
      setTick(num)
    })
    sim.start()
    sim.tickEvery(1000)
    
    logs.on('decentracar:driver', (...logStrings:any[]) => {
      appLogs.unshift(<LogDisplay icon={driverPng} txt={logStrings.join(' ')}/>)
      setAppLogs(appLogs)
    })

    logs.on('decentracar:rider', (...logStrings:any[]) => {
      appLogs.unshift(<LogDisplay icon={riderPng} txt={logStrings.join(' ')}/>)
      setAppLogs(appLogs)
    })

    setSimulation(sim)
  }

  return (
    <div>
      <Container>
        <Navbar>
          <Navbar.Item>Decentracar Simulation</Navbar.Item>
          <Navbar.Item>tick: {tick}</Navbar.Item>
        </Navbar>
        {simulation ? <SimulationDisplay simulation={simulation} logs={appLogs} /> :
          <Content>
            <p>This is a simulation of a simplified decentralized car sharing app, a technical overview is available.</p>
            <p><Button onClick={handleStart}>Click here to start</Button></p>
          </Content>
        }
      </Container>
    </div>
  );
}

export default App;
