import React, { useState } from 'react';
import './App.css';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import { getAppCommunity } from './decentracar/util/appcommunity';
import { Driver } from './decentracar/driver';
import { Simulation} from './decentracar/simulation'

const position: [number, number] = [52.491362, 13.362029];


const DriverMarker = ({name,lat,long}:{name:string, lat:number, long:number})=> {
  return (
      <Marker key={name} position={[lat, long]}>
          <Popup>A Driver: {name}</Popup>
      </Marker>
  )
}

const App: React.FC = () => {

  const [simulation,setSimulation] = useState(null as null|Simulation)
  const [tick,setTick] = useState(0)

  const handleStart = async () => {
    const simulation = new Simulation({
      community: getAppCommunity(),
      driverCount: 2,
    })
    setSimulation(simulation)
    simulation.on('tick', (num) =>{
      setTick(num)
    })
    simulation.start()
  }

  let markers:JSX.Element[] = []
  if (simulation) {
    for (let d of simulation.drivers) {
      markers = markers.concat(<DriverMarker name={d.name} lat={d.location.y} long={d.location.x}/>)
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
