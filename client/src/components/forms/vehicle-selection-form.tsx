import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface VehicleSelectionFormProps {
  onSelection: (vehicleCount: number) => void;
}

export function VehicleSelectionForm({ onSelection }: VehicleSelectionFormProps) {
  const [selectionType, setSelectionType] = useState<"single" | "multiple" | "">("");
  const [vehicleCount, setVehicleCount] = useState(2);

  const handleContinue = () => {
    if (selectionType === "single") {
      onSelection(1);
    } else if (selectionType === "multiple") {
      onSelection(vehicleCount);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Vehicle Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Is this invoice for single or multiple vehicles?</Label>
          <RadioGroup 
            value={selectionType} 
            onValueChange={(value) => setSelectionType(value as "single" | "multiple")}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Single Vehicle</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multiple" id="multiple" />
              <Label htmlFor="multiple">Multiple Vehicles</Label>
            </div>
          </RadioGroup>
        </div>

        {selectionType === "multiple" && (
          <div className="space-y-2">
            <Label htmlFor="vehicleCount">How many vehicles?</Label>
            <Input
              id="vehicleCount"
              type="number"
              min="2"
              max="20"
              value={vehicleCount}
              onChange={(e) => setVehicleCount(parseInt(e.target.value) || 2)}
              className="w-24"
            />
          </div>
        )}

        <Button 
          onClick={handleContinue}
          disabled={!selectionType}
          className="w-full"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}