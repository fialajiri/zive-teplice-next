"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CropPixels } from "@/components/admin/image-crop";

export function ImageCropDialog({
  imageUrl,
  aspectRatio,
  onConfirm,
  onCancel,
}: {
  imageUrl: string;
  aspectRatio: number;
  onConfirm: (crop: CropPixels) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-lg gap-4">
        <DialogTitle className="text-lg">Oříznout obrázek</DialogTitle>
        <div className="bg-muted relative h-80 w-full overflow-hidden rounded-lg">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="crop-zoom"
            className="text-muted-foreground text-sm whitespace-nowrap"
          >
            Přiblížení
          </label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Zrušit
          </Button>
          <Button
            type="button"
            disabled={!croppedAreaPixels}
            onClick={() => {
              if (croppedAreaPixels) onConfirm(croppedAreaPixels);
            }}
          >
            Použít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
