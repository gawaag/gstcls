/// <reference types="vite/client" />
declare module "jsqr" {
  const jsQR: (
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) => { data: string } | null
  export default jsQR
}
