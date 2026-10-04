"use client";

import dynamic from "next/dynamic";

// Force the component to load only in the browser (client-side)
const MapWrapper = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-200 rounded-xl" />,
});

// FIXED: Export the wrapped version, NOT the raw Map!
export default MapWrapper;