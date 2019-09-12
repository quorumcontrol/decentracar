import React from 'react';
import './App.css';
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';

const position: [number, number] = [52.491362, 13.362029]


const App: React.FC = () => {
  return (
    <div className="App">
      <Map zoom={12} center={position}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />
        <Marker position={position}>
      <Popup>A pretty CSS3 popup.<br />Easily customizable.</Popup>
    </Marker>
        <Marker position={[52.5, 13.4]} draggable={true}>
          <Popup>A pretty CSS3 popup.<br />Easily customizable.</Popup>
        </Marker>
      </Map>
    </div>
  );
}

export default App;
