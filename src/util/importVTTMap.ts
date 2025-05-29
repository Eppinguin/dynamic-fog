import OBR, { buildPath, PathCommand, Vector2, Command } from "@owlbear-rodeo/sdk";
import { VTTMapData, WallPoint, Portal } from "../types/VTTMapData";
import { getPluginId } from "./getPluginId";
import { Door } from "../types/Door";

// Parses a Universal VTT (UVTT) or DD2VTT file and returns the map data
export async function parseVTTFile(file: File): Promise<VTTMapData | null> {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the file format
        if (!data.resolution || !data.resolution.map_size || !data.resolution.pixels_per_grid) {
            console.error("Invalid VTT file format: missing resolution data");
            return null;
        }

        // Check if it's a UVTT or DD2VTT file
        if (!data.line_of_sight && !data.walls) {
            console.error("Invalid VTT file format: missing walls or line_of_sight data");
            return null;
        }

        return data as VTTMapData;
    } catch (error) {
        console.error("Error parsing VTT file:", error);
        return null;
    }
}

// Converts VTT wall data points to OBR path commands
function convertWallsToPathCommands(walls: Array<Array<WallPoint>>): PathCommand[] {
    const commands: PathCommand[] = [];

    walls.forEach((wall) => {
        if (wall.length < 2) return;

        // Start a new subpath for each wall
        commands.push([Command.MOVE, wall[0].x, wall[0].y]);

        // Add line segments for the rest of the points
        for (let i = 1; i < wall.length; i++) {
            commands.push([Command.LINE, wall[i].x, wall[i].y]);
        }
    });

    return commands;
}

// Creates doors from portal data
function createDoorsFromPortals(portals: Portal[] | undefined): Door[] {
    if (!portals || portals.length === 0) return [];

    const doors: Door[] = [];

    portals.forEach((portal, portalIndex) => {
        if (!portal.bounds || portal.bounds.length !== 2) return;

        // For each portal, we create a door with an approximated position
        // In a real implementation, we would need to find the exact wall segment
        // that contains this portal
        doors.push({
            open: !portal.closed,
            start: {
                // We use a fixed distance and index as an approximation
                distance: 0,
                index: portalIndex
            },
            end: {
                distance: 50, // Some arbitrary distance along the path
                index: portalIndex
            }
        });
    });

    return doors;
}

// Scale and convert walls from VTT coordinates to OBR coordinates
function transformWalls(walls: Array<Array<WallPoint>>, pixelsPerGrid: number, gridScale: number): Array<Array<WallPoint>> {
    const scaleFactor = gridScale / pixelsPerGrid;

    return walls.map(wall =>
        wall.map(point => ({
            x: point.x * scaleFactor,
            y: point.y * scaleFactor
        }))
    );
}

// Import VTT file data and create walls in OBR
export async function importVTTMapToOBR(data: VTTMapData): Promise<boolean> {
    try {
        // Get scene information for proper scaling
        const grid = await OBR.scene.grid.getScale();
        const gridScale = grid.parsed.multiplier; // Use parsed.multiplier instead of scale

        // Get viewport dimensions
        const height = await OBR.viewport.getHeight();
        const width = await OBR.viewport.getWidth();

        // Extract wall data from either format
        const walls = data.line_of_sight || data.walls;
        if (!walls || walls.length === 0) {
            console.error("No wall data found in the VTT file");
            return false;
        }

        // Transform wall coordinates to match OBR's coordinate system
        const pixelsPerGrid = data.resolution.pixels_per_grid;
        const transformedWalls = transformWalls(walls, pixelsPerGrid, gridScale);

        // Convert walls to path commands
        const pathCommands = convertWallsToPathCommands(transformedWalls);

        // Calculate the center position for the drawing
        const center: Vector2 = {
            x: width / 2,
            y: height / 2
        };

        // Create the path item
        const wallsPath = buildPath()
            .commands(pathCommands)
            .layer("FOG")
            .position(center)
            .fillRule("nonzero")
            .fillOpacity(0)
            .strokeWidth(5)
            .strokeColor("#000000")
            .build();

        // Create doors if portals exist
        if (data.portals && data.portals.length > 0) {
            const doors = createDoorsFromPortals(data.portals);
            if (doors.length > 0) {
                wallsPath.metadata = {
                    [getPluginId("doors")]: doors
                };
            }
        }

        // Add the item to the scene
        await OBR.scene.items.addItems([wallsPath]);

        return true;
    } catch (error) {
        console.error("Error importing VTT map to OBR:", error);
        return false;
    }
}
