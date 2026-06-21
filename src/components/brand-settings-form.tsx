"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateBrandProfile } from "@/app/(app)/settings/actions";
import type { Brand } from "@/lib/types";

const schema = z.object({
  company_name: z.string().max(120).optional(),
  website: z
    .string()
    .url("Enter a valid URL")
    .max(200, "URL is too long")
    .or(z.literal(""))
    .optional(),
  description: z.string().max(600).optional(),
});

type FormValues = z.infer<typeof schema>;

export function BrandSettingsForm({
  brand,
  userId,
}: {
  brand: Brand;
  userId: string;
}) {
  const supabase = createClient();
  const [logoUrl, setLogoUrl] = useState(brand.logo_url ?? "");
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: brand.company_name ?? "",
      website: brand.website ?? "",
      description: brand.description ?? "",
    },
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Friendly client-side guards before we hit storage.
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, SVG…).");
      e.target.value = "";
      return;
    }
    const MAX_MB = 2;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`That image is too large — keep it under ${MAX_MB}MB.`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/logo.${ext}`;
      const { error } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      // cache-bust so the new logo shows immediately
      setLogoUrl(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Logo uploaded.");
    } catch {
      toast.error("Upload failed. Is the 'logos' storage bucket created?");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v != null) fd.set(k, String(v));
    });
    fd.set("logo_url", logoUrl);
    try {
      const res = await updateBrandProfile(fd);
      if (res?.ok) toast.success("Profile saved.");
      else if (res?.reason === "validation")
        toast.error("Please check the highlighted fields and try again.");
      else toast.error("Could not save profile.");
    } catch {
      toast.error("Could not save profile.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand profile</CardTitle>
          <CardDescription>
            Artists see this when you send them a deal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={64}
                height={64}
                unoptimized
                className="size-16 rounded-md border object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                <Upload className="size-5" />
              </div>
            )}
            <div>
              <Label htmlFor="logo" className="mb-2">
                Logo
              </Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={onUpload}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Square image works best · PNG/JPG · up to 2MB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" {...register("company_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://yourbrand.com"
              {...register("website")}
            />
            {errors.website && (
              <p className="text-sm text-destructive">
                {errors.website.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || uploading}>
        Save changes
      </Button>
    </form>
  );
}
