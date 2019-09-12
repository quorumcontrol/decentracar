import React, { useState, useEffect } from 'react';
import './App.css';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import { getAppCommunity } from './decentracar/util/appcommunity';
import { randomGeo, mapCenter } from './decentracar/util/locations';
import { Driver } from './decentracar/driver';

const position: [number, number] = [52.491362, 13.362029]


const App: React.FC = () => {

  const [driver,setDriver] = useState(null as null|Driver)
  const [loc,setLoc] = useState(position)

  const initialize = async ()=> {
    if (!driver) {
      let c = await getAppCommunity()
      const rndLoc = randomGeo(mapCenter, 1000) //supposed to be 1km away
      const d = new Driver({
          community: c,
          location: rndLoc,
      })
      setInterval(()=> {
        d.tick()
        setLoc([d.location.y, d.location.x])
      },1000)
      setDriver(d)
    }
   
  }

  useEffect(()=> {
    initialize()
  })

  return (
    <div className="App">
          {driver &&
      <Map zoom={12} center={position}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />
        <Marker position={loc}>
          <Popup>A pretty CSS3 popup.<br />Easily customizable.</Popup>
        </Marker>
      </Map>
          }
    </div>
  );
}

export default App;
