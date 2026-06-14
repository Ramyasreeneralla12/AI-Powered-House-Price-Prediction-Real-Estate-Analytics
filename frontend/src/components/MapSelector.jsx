import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset paths in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom pulsing icon for selected point
const selectedIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'map-pulse-marker'
});

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore center

// Component to handle map center changes dynamically
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center]);
  return null;
};

// Component to handle user click events on Leaflet map
const MapEventsHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
};

const MapSelector = ({ selectedLocation, onLocationSelect, heatmapData, showHeatmap, areas }) => {
  const center = selectedLocation || DEFAULT_CENTER;
  
  // Custom circular heatmap marker color based on predicted price
  const getHeatColor = (price) => {
    if (price > 150) return '#EF4444'; // Red (Premium)
    if (price > 75) return '#F59E0B';  // Yellow (Medium)
    return '#10B981';                  // Green (Affordable)
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl border border-slate-800">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme tile layer
        />
        
        <ChangeView center={selectedLocation} />
        
        <MapEventsHandler onLocationSelect={onLocationSelect} />

        {/* City Areas Circle Markers */}
        {areas && areas.map((area, idx) => (
          <CircleMarker
            key={`area-${idx}`}
            center={area.coords}
            radius={8}
            pathOptions={{
              fillColor: '#3B82F6',
              color: '#1E40AF',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
            eventHandlers={{
              click: () => {
                onLocationSelect(area.coords[0], area.coords[1]);
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span className="text-xs font-semibold text-slate-800">{area.name}</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Selected location marker */}
        {selectedLocation && (
          <Marker position={selectedLocation} icon={selectedIcon}>
            <Popup>
              <div className="text-slate-200">
                <p className="font-semibold text-brand-primary">Selected Property Location</p>
                <p className="text-xs">Lat: {selectedLocation[0].toFixed(5)}</p>
                <p className="text-xs">Lng: {selectedLocation[1].toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Price Heatmap Layer */}
        {showHeatmap && heatmapData && heatmapData.map((pt, idx) => (
          <L.Circle
            key={idx}
            center={[pt.lat, pt.lng]}
            radius={600} // radius in meters
            pathOptions={{
              fillColor: getHeatColor(pt.price),
              color: getHeatColor(pt.price),
              weight: 1,
              opacity: 0.15,
              fillOpacity: 0.35
            }}
          >
            <Popup>
              <div className="text-slate-200 text-xs">
                <p className="font-bold">Historical Valuation</p>
                <p>Value: <span className="font-semibold text-brand-success">₹{pt.price.toFixed(2)} Lakhs</span></p>
              </div>
            </Popup>
          </L.Circle>
        ))}
      </MapContainer>
      
      {/* Visual Map legend */}
      {showHeatmap && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-2 rounded-lg z-[1000] text-xs flex flex-col gap-1.5 shadow-lg">
          <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1">Price Heatmap Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block opacity-75"></span>
            <span>Premium (&gt; ₹1.5 Cr)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block opacity-75"></span>
            <span>Mid-Range (₹75L - ₹1.5 Cr)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block opacity-75"></span>
            <span>Affordable (&lt; ₹75L)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSelector;
