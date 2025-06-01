import OBR, {
    buildImageUpload,
    buildSceneUpload,
    Item,
    Vector2,
    buildPath,
    Path,
    PathCommand,
    Command
} from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";


// Interface for Universal VTT format
export interface ParsedUVTTData {
    data: UniversalVTT;
    scaleFactorX: number;
    scaleFactorY: number;
    originOffsetX: number;
    originOffsetY: number;
}

export interface UniversalVTT {
    format: number;
    resolution: {
        map_origin: {
            x: number;
            y: number;
        },
        map_size: {
            x: number;
            y: number;
        },
        pixels_per_grid: number;
    };
    line_of_sight: Vector2[][];
    objects_line_of_sight?: Vector2[][];
    portals?: {
        position: {
            x: number;
            y: number;
        },
        bounds: Vector2[],
        rotation: number;
        closed: boolean;
        freestanding: boolean;
    }[];
    environment?: {
        baked_lighting: boolean;
        ambient_light: string;
    };
    lights?: {
        position: Vector2;
        range: number;
        intensity: number;
        color: string;
        shadows: boolean;
    }[];
    image: string;
}

// Create a new scene with just the map image
export async function uploadSceneFromVTT(file: File): Promise<void> {
    const content = await readFileAsText(file);
    const data: UniversalVTT = JSON.parse(content);

    if (!data.image) {
        throw new Error("No map image found in UVTT file");
    }

    // Convert base64 to Blob/File
    const imageData = atob(data.image);
    const arrayBuffer = new ArrayBuffer(imageData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < imageData.length; i++) {
        uint8Array[i] = imageData.charCodeAt(i);
    }
    const imageBlob = new Blob([arrayBuffer], { type: 'image/png' });
    const imageFile = new File([imageBlob], "map.png", { type: 'image/png' });

    // Create and upload just the map as a scene
    const imageUpload = buildImageUpload(imageFile)
        .dpi(data.resolution.pixels_per_grid)
        .name("Imported Map")
        .build();

    const sceneUpload = buildSceneUpload()
        .name(file.name.replace(/\.[^/.]+$/, ""))
        .baseMap(imageUpload)
        .gridType("SQUARE")
        .gridScale(data.resolution.pixels_per_grid.toString())
        .build();

    await OBR.assets.uploadScenes([sceneUpload]);
}

// Add items from VTT file to the current scene
export async function addItemsFromVTT(file: File): Promise<void> {
    if (!OBR.scene.isReady()) {
        console.error("Scene is not ready. Please wait until the scene is fully loaded.");
    }

    const content = await readFileAsText(file);
    const data: UniversalVTT = JSON.parse(content);
    console.log("Parsed UVTT data line_of_sight length:", data.line_of_sight?.length);
    console.log("First wall points:", data.line_of_sight?.[0]);

    const sceneItems: Item[] = [];

    // Create walls from UVTT data
    const walls = await createWallItems(data);
    sceneItems.push(...walls);


    // // Create lights
    // if (data.lights && data.lights.length > 0) {
    //     const lights = await createLightItems(data);
    //     sceneItems.push(...lights);
    // }

    // Create doors
    if (data.portals && data.portals.length > 0) {
        const doors = await createDoorItems(data);
        sceneItems.push(...doors);
    }

    // Create lights
    // Uncomment and implement if needed:
    /*if (data.lights && data.lights.length > 0) {
        const lights = await createLightItems(data);
        sceneItems.push(...lights);
    }*/

    console.log("About to add items to scene:", sceneItems);
    await OBR.scene.items.addItems(sceneItems);
    console.log("Items added to scene successfully");
    await OBR.scene.fog.setFilled(true);

    const Items = await OBR.scene.items.getItems();
    console.log("All items in scene after adding:", Items);
}

// Helper function to read file as text
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Create wall items for the scene
async function createWallItems(data: UniversalVTT): Promise<Item[]> {
    // Combine both line_of_sight data sources if available
    const walls = [...(data.line_of_sight || [])];
    if (data.objects_line_of_sight) {
        walls.push(...data.objects_line_of_sight);
    }
    console.log("Total walls found:", walls.length);

    if (walls.length === 0) {
        console.warn("No wall data found in the UVTT file");
        return [];
    }
    const dpi = await OBR.scene.grid.getDpi();

    const wallItems: Item[] = [];

    for (const wall of walls) {
        if (wall.length < 2) continue;

        // Scale the wall points and adjust for origin offset
        const points = wall.map(point => {
            // Handle potential nested coordinate objects
            const x = typeof point.x === 'number' ? point.x : point.x;
            const y = typeof point.y === 'number' ? point.y : point.y;
            return { x: x * dpi, y: y * dpi };
        });

        // Log the points we're using for this wall
        console.log("Creating wall with points:", points);

        // Create the wall item using buildPath
        const commands: PathCommand[] = [
            [Command.MOVE, points[0].x, points[0].y],
            ...points.slice(1).map(p => [Command.LINE, p.x, p.y] as PathCommand)
        ];

        const wallItem = buildPath()
            .strokeColor("#000000")
            .fillOpacity(0)
            .strokeOpacity(1)
            .strokeWidth(2)
            .commands(commands)
            .layer("FOG")
            .name("Wall")
            .visible(true)
            .build();

        wallItems.push(wallItem);
    }

    return wallItems;
}

// Create door items for the scene
async function createDoorItems(data: UniversalVTT): Promise<Path[]> {
    if (!data.portals || data.portals.length === 0) return [];

    const doorItems: Path[] = [];
    const dpi = await OBR.scene.grid.getDpi();

    for (const portal of data.portals) {
        if (portal.bounds.length < 2) continue;

        // Scale the portal points
        const points = portal.bounds.map(point => ({
            x: point.x * dpi,
            y: point.y * dpi
        }));

        // Create the door as a path
        const doorCommands: PathCommand[] = [
            [Command.MOVE, points[0].x, points[0].y],
            [Command.LINE, points[points.length - 1].x, points[points.length - 1].y]
        ];

        const doorItem = buildPath()
            .name("Door")
            .fillRule("nonzero")
            .style({
                fillColor: "black",
                fillOpacity: 0,
                strokeColor: "#FF0000",
                strokeOpacity: 1,
                strokeWidth: 5,
                strokeDash: []
            })
            .commands(doorCommands)
            .layer("FOG")
            .metadata({
                [getPluginId("doors")]: [{
                    open: !portal.closed,
                    start: {
                        // Start distance should be 0 since it's at the start of the path
                        distance: 0,
                        index: 0
                    },
                    end: {
                        // End distance is the total length of the path segment
                        distance: Math.sqrt(Math.pow(points[points.length - 1].x - points[0].x, 2) + Math.pow(points[points.length - 1].y - points[0].y, 2)),
                        index: 0
                    }
                }]
            })
            .build();

        doorItems.push(doorItem);
    }

    return doorItems;
}

// Create light items for the scene
async function createLightItems(data: UniversalVTT): Promise<Item[]> {
    if (!data.lights || data.lights.length === 0) return [];

    const gridDpi = await OBR.scene.grid.getDpi();
    const lightItems: Item[] = [];

    for (const light of data.lights) {
        // Scale the light position and adjust for origin offset
        const position = {
            x: light.position.x,
            y: light.position.y
        };

        // Scale the light range
        const scaledRange = light.range * gridDpi;

        // Create a light item with metadata
        const lightItem: Item = {
            type: "BASIC", // Basic item type
            id: crypto.randomUUID(),
            name: "Light",
            createdUserId: OBR.player.id,
            lastModified: new Date().toISOString(),
            lastModifiedUserId: OBR.player.id,
            locked: false,
            visible: true,
            layer: "CHARACTER", // Keep on character layer so it's visible
            position: position,
            rotation: 0,
            scale: { x: 1, y: 1 },
            zIndex: 0,
            metadata: {
                [getPluginId("light")]: {
                    attenuationRadius: scaledRange,
                    sourceRadius: 25, // Default value
                    falloff: 0.2, // Default value
                    lightType: "PRIMARY"
                }
            }
        };

        lightItems.push(lightItem);
    }

    return lightItems;
}
