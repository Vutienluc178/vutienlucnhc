export type ToolType = 
  | 'pen' 
  | 'calligraphy'
  | 'line' 
  | 'dashed' 
  | 'circle' 
  | 'ellipse' 
  | 'rect' 
  | 'triangle' 
  | 'axis' 
  | 'eraser' 
  | 'text'
  | 'coord_3d'
  | 'cube'
  | 'cuboid'
  | 'pyramid_tri'
  | 'pyramid_tri_right'
  | 'pyramid_quad'
  | 'pyramid_quad_right'
  | 'prism_tri'
  | 'cylinder'
  | 'cone';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingSettings {
  color: string;
  width: number;
  opacity: number;
  fontSize: number;
}