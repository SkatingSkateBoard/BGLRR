"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import images directly
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Your helper function to handle both Turbopack (string) and Webpack (object) formats
const toUrl = (img: string | { src: string }) =>
  typeof img === "string" ? img : img.src;

const defaultIcon = L.icon({
  iconUrl: toUrl(markerIcon),
  iconRetinaUrl: toUrl(markerIcon2x),
  shadowUrl: toUrl(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type MapProps = {
  center?: [number, number];
  zoom?: number;
};

export default function Map({
  center = [14.727383204246985, 121.06898310048751], // [lat, lng]
  zoom = 18,
}: MapProps) {
  return (
    <div style={{ height: "100%", width: "100%", minHeight: "500px", position: "relative" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full absolute inset-0 rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://openstreetmap.org{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={defaultIcon}>
          <Popup>You are here</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}