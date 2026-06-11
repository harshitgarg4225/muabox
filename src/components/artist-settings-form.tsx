"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateArtistProfile } from "@/app/(app)/settings/actions";
import { SPECIALTIES } from "@/lib/specialties";
import { RateCardFields, type RateRow } from "@/components/rate-card-fields";
import { cn } from "@/lib/utils";
import type { Artist } from "@/lib/types";

const schema = z
  .object({
    display_name: z.string().max(80).optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(120).optional(),
    pricing: z.enum(["fixed", "custom"]),
    price_min: z.coerce.number().min(0).optional(),
    price_max: z.coerce.number().min(0).optional(),
    currency: z.string().length(3),
  })
  .refine(
    (d) =>
      d.pricing !== "fixed" ||
      d.price_min == null ||
      d.price_max == null ||
      d.price_max >= d.price_min,
    { message: "Max must be ≥ min", path: ["price_max"] }
  );

type FormValues = z.input<typeof schema>;

export function ArtistSettingsForm({ artist }: { artist: Artist }) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: artist.display_name ?? "",
      bio: artist.bio ?? "",
      location: artist.location ?? "",
      pricing: artist.pricing,
      price_min: artist.price_min != null ? artist.price_min / 100 : undefined,
      price_max: artist.price_max != null ? artist.price_max / 100 : undefined,
      currency: artist.currency ?? "INR",
    },
  });

  const pricing = useWatch({ control, name: "pricing" });
  const [specialties, setSpecialties] = useState<string[]>(
    artist.specialties ?? []
  );
  const [collabTypes, setCollabTypes] = useState<string[]>(
    artist.collab_types ?? []
  );
  const [rateRows, setRateRows] = useState<RateRow[]>(
    (artist.rate_card ?? []).map((r) => ({
      deliverable: r.deliverable,
      price: r.price != null ? String(Math.round(r.price / 100)) : "",
    }))
  );
  const [minBudget, setMinBudget] = useState<string>(
    artist.min_budget != null ? String(Math.round(artist.min_budget / 100)) : ""
  );

  function toggleSpecialty(sp: string) {
    setSpecialties((cur) =>
      cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp]
    );
  }

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v != null && v !== "") fd.set(k, String(v));
    });
    fd.set("specialties", specialties.join(","));
    fd.set("collab_types", collabTypes.join(","));
    fd.set("min_budget", minBudget);
    fd.set(
      "rate_card",
      JSON.stringify(
        rateRows.map((r) => ({
          deliverable: r.deliverable,
          price: r.price ? Math.round(Number(r.price) * 100) : null,
        }))
      )
    );
    try {
      await updateArtistProfile(fd);
      toast.success("Profile saved.");
    } catch {
      toast.error("Could not save profile.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This is what brands see alongside your Instagram stats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" {...register("display_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, Country"
              {...register("location")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} {...register("bio")} />
          </div>
          <div className="space-y-2">
            <Label>Specialties</Label>
            <p className="text-sm text-muted-foreground">
              Pick your luxury niches — brands filter and target campaigns by
              these.
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => toggleSpecialty(sp)}
                  aria-pressed={specialties.includes(sp)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    specialties.includes(sp)
                      ? "border-navy bg-navy text-white"
                      : "text-muted-foreground hover:border-navy hover:text-navy"
                  )}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Choose fixed tiers or let brands contact you for a custom quote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pricing model</Label>
            <Select
              value={pricing}
              onValueChange={(v) =>
                setValue("pricing", v as "fixed" | "custom", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom / contact me</SelectItem>
                <SelectItem value="fixed">Fixed price range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pricing === "fixed" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price_min">Min</Label>
                <Input
                  id="price_min"
                  type="number"
                  min={0}
                  step="1"
                  {...register("price_min")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_max">Max</Label>
                <Input
                  id="price_max"
                  type="number"
                  min={0}
                  step="1"
                  {...register("price_max")}
                />
                {errors.price_max && (
                  <p className="text-sm text-destructive">
                    {errors.price_max.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  className="uppercase"
                  {...register("currency")}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collaborations &amp; rate card</CardTitle>
          <CardDescription>
            Spell out the deals you do and what they cost. This is the first
            thing luxury brands look at.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RateCardFields
            collabTypes={collabTypes}
            onCollabChange={setCollabTypes}
            rows={rateRows}
            onRowsChange={setRateRows}
            minBudget={minBudget}
            onMinBudgetChange={setMinBudget}
          />
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}
