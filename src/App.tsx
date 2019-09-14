import React, { useState } from 'react';
import './App.css';
import { Map, Marker, Popup, TileLayer, Tooltip} from 'react-leaflet';
import { getAppCommunity } from './decentracar/util/appcommunity';
import { Simulation} from './decentracar/simulation'
import {Icon, Point} from 'leaflet'

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

const DriverMarker = ({name,lat,long}:{name:string, lat:number, long:number})=> {
  return (
      <Marker key={name} position={[lat, long]} icon={driverIcon}>
          <Popup>A Driver: {name}</Popup>
          <Tooltip>Driver</Tooltip>
      </Marker>
  )
}

const RiderMarker = ({name,lat,long}:{name:string, lat:number, long:number})=> {
  return (
      <Marker key={name} position={[lat, long]} icon={riderIcon}>
          <Popup>A Rider: {name}</Popup>
          <Tooltip>Rider</Tooltip>
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
      riderProbability: 10,
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
      markers.push(<DriverMarker name={d.name} lat={d.location.y} long={d.location.x}/>)
    }

    for (let r of simulation.riders) {
      markers.push(<RiderMarker name={r.name} lat={r.location.y} long={r.location.x}/>)
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
        {console.log(markers)}
        {markers}
      </Map>
          }
    </div>
  );
}

export default App;
