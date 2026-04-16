import xml.etree.ElementTree as ET

# 1. Your existing 44 IDs
existing_ids = {
    "CarpalsLeft", "CarpalsRight", "CervicalVertebrae", "ClavicleLeft", "ClavicleRight",
    "Coccyx", "Cranium", "FemurLeft", "FemurRight", "FibulaLeft", "FibulaRight",
    "FootLeft", "FootRight", "HandLeft", "HandRight", "HumerusLeft", "HumerusRight",
    "LumbarVertebrae", "Mandible", "Manubrium", "MetacarpalsLeft", "MetacarpalsRight",
    "MetatarsalsLeft", "MetatarsalsRight", "PatellaLeft", "PatellaRight", "PelvicGirdle",
    "PhalangesFootLeft", "PhalangesFootRight", "PhalangesLeft", "PhalangesRight",
    "RadiusLeft", "RadiusRight", "Sacrum", "Scapula", "Skull", "Sternum",
    "TarsalsLeft", "TarsalsRight", "ThoracicVertebrae", "TibiaLeft", "TibiaRight",
    "UlnaLeft", "UlnaRight"
}

def identify_missing_bones(svg_input_path, svg_output_path):
    # Register namespaces to prevent 'ns0' prefixes in output
    ET.register_namespace('', "http://www.w3.org/2000/svg")
    tree = ET.parse(svg_input_path)
    root = tree.getroot()

    unlabeled_count = 0
    
    # Iterate through all path elements
    for path in root.findall(".//{http://www.w3.org/2000/svg}path"):
        path_id = path.get('id')
        
        # If the path has no ID or is a generic one not in your list
        if not path_id or path_id not in existing_ids:
            unlabeled_count += 1
            # You can manually assign here or let the script auto-index them for review
            # For now, let's mark them so you can find them in Inkscape/Editor
            if not path_id:
                new_id = f"UNKNOWN_BONE_{unlabeled_count}"
                path.set('id', new_id)
                print(f"Assigned placeholder: {new_id}")

    tree.write(svg_output_path)
    print(f"\nFinished! Found {unlabeled_count} paths to identify.")

# Usage
# identify_missing_bones('your_skeleton.svg', 'labeled_skeleton.svg')