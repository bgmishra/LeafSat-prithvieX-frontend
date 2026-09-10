"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { createProcessingJob } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const sampleGeoJson = JSON.stringify(
  {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [85.25, 27.6],
              [85.45, 27.6],
              [85.45, 27.78],
              [85.25, 27.78],
              [85.25, 27.6],
            ],
          ],
        },
      },
    ],
  },
  null,
  2,
);

export function ProcessingJobForm() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-05-29");
  const [serviceName, setServiceName] = useState("NDVI");
  const [geojsonText, setGeojsonText] = useState(sampleGeoJson);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const geojson = JSON.parse(geojsonText);
      const response = await createProcessingJob({
        geojson,
        startDate,
        endDate,
        serviceName,
        userEmail,
      });
      router.push(`/orders/${response.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit processing job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8">
      <div>
        <p className="mono-label text-cyber-green">Processing</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Create geospatial job</h1>
      </div>

      <div className="grid gap-4 rounded-lg border border-white/10 bg-slate-950/70 p-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-200">
          User email
          <Input value={userEmail} onChange={(event) => setUserEmail(event.target.value)} type="email" required />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Service
          <Select value={serviceName} onChange={(event) => setServiceName(event.target.value)}>
            <SelectOption value="NDVI">NDVI</SelectOption>
            <SelectOption value="NDWI">NDWI</SelectOption>
            <SelectOption value="FLOOD_MAPPING">Flood mapping</SelectOption>
            <SelectOption value="CROP_HEALTH">Crop health</SelectOption>
            <SelectOption value="LAND_COVER">Land cover</SelectOption>
          </Select>
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Start date
          <Input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" required />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          End date
          <Input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" required />
        </label>
      </div>

      <label className="grid gap-2 text-sm text-slate-200">
        GeoJSON
        <Textarea
          value={geojsonText}
          onChange={(event) => setGeojsonText(event.target.value)}
          className="min-h-80 font-mono"
          spellCheck={false}
          required
        />
      </label>

      {error ? <p className="rounded-md border border-red-400/30 bg-red-950/50 px-3 py-2 text-sm text-red-100">{error}</p> : null}

      <Button type="submit" disabled={submitting} className="w-fit">
        <Send className="size-4" />
        {submitting ? "Submitting" : "Submit job"}
      </Button>
    </form>
  );
}
