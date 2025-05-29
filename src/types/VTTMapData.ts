// Types for Universal VTT (UVTT) and DD2VTT file formats

export interface PortalPoint {
    x: number;
    y: number;
}

export interface Portal {
    closed: boolean;
    freestanding: boolean;
    // The coordinates of the portal/door
    bounds: [PortalPoint, PortalPoint];
}

export interface WallPoint {
    x: number;
    y: number;
}

export interface LightSource {
    x: number;
    y: number;
    color?: string;
    range?: number;
    intensity?: number;
}

// This interface covers both UVTT and DD2VTT formats
export interface VTTMapData {
    resolution: {
        map_origin: {
            x: number;
            y: number;
        };
        map_size: {
            x: number;
            y: number;
        };
        pixels_per_grid: number;
    };
    line_of_sight?: Array<Array<WallPoint>>;
    portals?: Portal[];
    lights?: LightSource[];
    // DD2VTT format uses "walls" instead of "line_of_sight"
    walls?: Array<Array<WallPoint>>;
    // Additional properties may exist but aren't needed for our implementation
}
