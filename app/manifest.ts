import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    orientation: "any",
    display: "standalone",
    dir: "auto",
    lang: "en-US",
    name: "BGLRR Frontend",
    short_name: "BGLRRFrontend",
    description: "This is the frontend PWA for BGLRR",
    theme_color: "#000000",
    background_color: "#000000",
    
    start_url: "/",
    scope: "/",
    
    icons: [
      {
        src: "/icon512_maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  }
}