from PIL import Image
import os

source_path = r"C:\Users\SudanWarrior\.gemini\antigravity-ide\brain\e800e4df-4a29-42c8-a034-2c91dd17c296\um_favicon_hexagon_large_draft_1781126334012.png"
dest_path = r"c:\Users\SudanWarrior\Desktop\Program\AIStudio\unit-manager\public\favicon.png"

# Ensure the output directory exists
os.makedirs(os.path.dirname(dest_path), exist_ok=True)

# Open image and convert to RGBA
img = Image.open(source_path).convert("RGBA")
width, height = img.size
pixels = img.load()

# Start flood fill from the four corners to cover all outer regions
start_points = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
visited = set()
queue = []

# Top-left pixel as reference background color
bg_color = pixels[0, 0]

for pt in start_points:
    queue.append(pt)
    visited.add(pt)

# BFS Flood Fill to make outside transparent
while queue:
    x, y = queue.pop(0)
    current_color = pixels[x, y]
    
    # Calculate distance to reference background color (ignoring alpha channel)
    dist = sum((current_color[i] - bg_color[i]) ** 2 for i in range(3)) ** 0.5
    
    if dist < 45:  # Tolerance threshold
        # Make outer pixel transparent
        pixels[x, y] = (0, 0, 0, 0)
        
        # Add 4-directional neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                visited.add((nx, ny))
                queue.append((nx, ny))

# Calculate the bounding box of non-transparent pixels (alpha > 0)
bbox = img.getbbox()
if bbox:
    # Crop to the bounding box of the hexagon
    cropped_img = img.crop(bbox)
    cw, ch = cropped_img.size
    
    # Make it a perfect square to prevent distortion, using the larger dimension
    new_dim = max(cw, ch)
    square_img = Image.new("RGBA", (new_dim, new_dim), (0, 0, 0, 0))
    
    # Paste the cropped image in the center
    paste_x = (new_dim - cw) // 2
    paste_y = (new_dim - ch) // 2
    square_img.paste(cropped_img, (paste_x, paste_y))
    
    # Resize to a standard favicon size (e.g. 128x128) for high resolution
    final_img = square_img.resize((128, 128), Image.Resampling.LANCZOS)
    
    # Save the updated image
    final_img.save(dest_path, "PNG")
    print("Successfully generated and tightly cropped favicon at", dest_path)
else:
    # Fallback to saving original transparent image if bounding box calculation failed
    img.save(dest_path, "PNG")
    print("Warning: Bounding box failed. Saved transparent favicon without cropping at", dest_path)
