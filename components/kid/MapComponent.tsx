'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationResult } from '../../services/osmService';

// Fix for default marker icons in Leaflet with webpack/next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapComponentProps {
  selectedLocation: LocationResult | null;
  onMapClick: (lat: number, lng: number) => void;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Leaflet calls L.DomEvent.disableScrollPropagation on its container,
// which blocks wheel/trackpad events from reaching the page scroll container.
// Since scrollWheelZoom is disabled, undo this so the page scrolls normally.
function EnablePageScroll() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    L.DomEvent.off(container, 'wheel', L.DomEvent.stopPropagation);
  }, [map]);
  return null;
}

// Component to fly to selected location
function FlyToLocation({ location }: { location: LocationResult | null }) {
  const map = useMap();
  const hasFlownRef = useRef<string | null>(null);

  useEffect(() => {
    if (location) {
      const locationKey = `${location.lat}-${location.lng}`;
      if (hasFlownRef.current !== locationKey) {
        map.flyTo([location.lat, location.lng], 10, {
          duration: 1.5,
        });
        hasFlownRef.current = locationKey;
      }
    }
  }, [location, map]);

  return null;
}

const MapComponent: React.FC<MapComponentProps> = ({ selectedLocation, onMapClick }) => {
  return (
    <div className="relative">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        style={{ height: 'clamp(250px, 35vw, 450px)', width: '100%' }}
        className="z-0"
        worldCopyJump={true}
        scrollWheelZoom={false}
      >
        {/* Using a kid-friendly, colorful map style */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />
        <FlyToLocation location={selectedLocation} />
        <EnablePageScroll />

        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={customIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold text-slate-800">
                  {selectedLocation.city || 'Selected Location'}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedLocation.countryName}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
