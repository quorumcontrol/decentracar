import React, { useState } from 'react';
import './App.css';
import { Map, Marker, Popup, TileLayer, Tooltip} from 'react-leaflet';
import { getAppCommunity } from './decentracar/util/appcommunity';
import { Simulation} from './decentracar/simulation'
import {Icon, Point} from 'leaflet'
import { Driver } from './decentracar/driver';
import { Rider } from './decentracar/rider';

const position: [number, number] = [52.491362, 13.362029];

const driverIcon = new Icon({
  iconUrl: require('./imgs/driver.png'),
  iconRetinaUrl: require('./imgs/driver.png'),
  iconSize: new Point(30, 30),
  className: 'leaflet-div-icon'
});

const riderIcon = new Icon({
  iconUrl: require('./imgs/rider.png'),
  iconRetinaUrl: require('./imgs/rider.png'),
  iconSize: new Point(30, 30),
  className: 'leaflet-div-icon'
})

const DriverMarker = ({driver}:{driver:Driver})=> {
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

const RiderMarker = ({rider}:{rider:Rider})=> {
  return (
      <Marker position={[rider.location.y, rider.location.x]} icon={riderIcon}>
          <Popup>A Rider: {rider.name}</Popup>
          <Tooltip>{rider.name}</Tooltip>
      </Marker>
  )
}

const App: React.FC = () => {

  const [simulation,setSimulation] = useState(null as null|Simulation)
  const [tick,setTick] = useState(0)

  const handleStart = async () => {
    const simulation = new Simulation({
      community: getAppCommunity(),
      driverCount: 10,
      riderProbability: 5,
    })
    setSimulation(simulation)
    simulation.on('tick', (num) =>{
      setTick(num)
    })
    simulation.start()
    simulation.tickEvery(1000)
  }

  let markers:JSX.Element[] = []
  if (simulation) {
    for (let d of simulation.drivers) {
      markers.push(<DriverMarker key={d.name} driver={d}/>)
    }

    for (let r of simulation.riders) {
      markers.push(<RiderMarker key={r.name} rider={r}/>)
    }

  }

  return (
    <div className="App">
      <p>tick: {tick}</p>
      {!simulation && 
        <button onClick={handleStart}>Start</button>
      }
          {simulation &&
      <Map zoom={12} center={position}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />
        {markers}
      </Map>
          }
    </div>
  );
}

export default App;
