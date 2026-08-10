# Future Development Roadmap

## Option 2: Algorithmic ControlNets for Mathematically Perfect Floorplan Layouts
*Date added: July 2026*

**The Problem:**
Currently, the pipeline uses Gemini Vision to extract semantic text (e.g., "Bedroom, 120 sqft") and passes it to FLUX Pro (Text-to-Image). Because FLUX Pro only reads text, it has no native geometric awareness of the specific floorplan bounds.

**The Future Solution:**
To achieve mathematically perfect layouts that physically lock into the floorplan geometry, we must implement an algorithmic computer vision pipeline using **ControlNets**.

**Implementation Details:**
1. **SVG / Line Extraction:** Instead of passing the raw JPEG floorplan, run it through an edge-detection or line-extraction algorithm (like MLSD or OpenCV) to create a pure black-and-white wireframe map.
2. **Depth Mapping:** If the floorplan is 2D, extrude the walls into a 3D depth map computationally (e.g., raise walls by 10 units).
3. **ControlNet API:** Pass this wireframe or depth map directly into the image generation model alongside the prompt (e.g., using FLUX with a depth or structure ControlNet on fal.ai). 
4. **Result:** The AI will physically be unable to draw a wall where there isn't one, and it will be constrained by the exact bounding boxes of the room. Furniture will naturally scale to fit because the depth map enforces the physical boundaries.

*Note: This is a complex engineering task requiring multi-step computer vision processing before hitting the AI generation endpoint.*
