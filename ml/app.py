import io
import random
import base64
import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import torch
import torch.nn as nn
from torchvision import transforms as T
from torchvision.transforms import functional as F
from PIL import Image, ImageDraw
from inference_sdk import InferenceHTTPClient
from fastapi.middleware.cors import CORSMiddleware

# Ensure the uploads directory exists
os.makedirs("uploads", exist_ok=True)

class SEBlock(nn.Module):
    def __init__(self, in_channels, reduction=16):
        super().__init__()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(in_channels, in_channels//reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(in_channels//reduction, in_channels, bias=False),
            nn.Sigmoid()
        )
    def forward(self, x):
        b, c, _, _ = x.size()
        s = self.pool(x).view(b, c)
        s = self.fc(s).view(b, c, 1, 1)
        return x * s

from torchvision.models.detection import ssd300_vgg16
from torchvision.models.detection.ssd import SSDClassificationHead

def create_ssd300_vgg16_se(num_classes=3,
                           weights='SSD300_VGG16_Weights.DEFAULT'):
    model = ssd300_vgg16(weights=weights)
    
    layers = []
    for layer in model.backbone.features:
        layers.append(layer)
        if isinstance(layer, nn.Conv2d):
            layers.append(SEBlock(layer.out_channels))
    
    model.backbone.features = nn.Sequential(*layers)
    in_channels_list = [512, 1024, 512, 256, 256, 256]
    num_anchors = [4, 6, 6, 6, 4, 4]

    new_class_head = SSDClassificationHead(
        in_channels=in_channels_list,
        num_anchors=num_anchors,
        num_classes=num_classes  # Now 3
    )
    model.head.classification_head = new_class_head
    
    return model

INDEX_TO_NAME = {
    1: "Hole",
    2: "Infected"
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = create_ssd300_vgg16_se(num_classes=3, weights='SSD300_VGG16_Weights.DEFAULT')
model.load_state_dict(torch.load("ssd_attention.pth", map_location=device))  
MODEL = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="Gqf1hrF7jdAh8EsbOoTM"
)
model.to(device)
model.eval()

transform = T.Compose([
    T.ToTensor()
])

class PredictionRequest(BaseModel):
    image_path: str
    score_threshold: float

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    1. Accepts an image file.
    2. Saves the file to the uploads folder.
    3. Returns the path to the saved file.
    """
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    return {"image_path": file_location}

@app.post("/predict")
def predict(request: PredictionRequest):
    """
    1. Takes an image path (request.image_path).
    2. Opens the image and applies the model.
    3. Returns:
        - coordinates of boxes,
        - classes for each box,
        - base64-encoded image with drawn boxes.
    """
    image_path = request.image_path

    pil_image = Image.open(image_path).convert("RGB")

    img_tensor = transform(pil_image).to(device).unsqueeze(0)

    with torch.no_grad():
        outputs = model(img_tensor)[0]
    boxes = outputs['boxes'].cpu().numpy()
    scores = outputs['scores'].cpu().numpy()
    labels = outputs['labels'].cpu().numpy()

    score_threshold = request.score_threshold
    keep = scores >= score_threshold
    boxes = boxes[keep]
    scores = scores[keep]
    labels = labels[keep]

    boxes_list = boxes.tolist()
    labels_list = [INDEX_TO_NAME.get(int(lbl), int(lbl)) for lbl in labels]
    scores_list = scores.tolist()
    draw = ImageDraw.Draw(pil_image)
    for box, label, score in zip(boxes, labels_list, scores_list):
        x1, y1, x2, y2 = box
        draw.rectangle([(x1, y1), (x2, y2)], outline="red", width=2)
        text = f"{label} {score:.2f}"
        draw.text((x1, max(0, y1 - 10)), text, fill="red")
    
    Result = MODEL.infer(image_path, model_id="leaf-hole/1")

    img_buffer = io.BytesIO()
    pil_image.save(img_buffer, format="PNG")
    img_encoded = base64.b64encode(img_buffer.getvalue()).decode("utf-8")

    result = {
        "boxes": boxes_list,
        "labels": labels_list,
        "scores": scores_list,
        "image_base64": img_encoded
    }
    return JSONResponse(content=Result['predictions'])