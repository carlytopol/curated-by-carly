"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClothingItem, CreateClothingItemInput } from "@/types/wardrobe";

type ErrorResponse = {
  error?: string;
};

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  return body?.error ?? "Something went wrong. Please try again.";
}

async function fetchClothingItems() {
  const response = await fetch("/api/closet-items");

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as ClothingItem[];
}

export function useClothingItems() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setItems(await fetchClothingItems());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load your collection.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    fetchClothingItems()
      .then((items) => {
        if (isCurrent) {
          setItems(items);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load your collection.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const createItem = useCallback(async (input: CreateClothingItemInput, files: File[] = [], analyzeAfterUpload = true) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/closet-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const item = (await response.json()) as ClothingItem;
      const uploadedPhotoIds: string[] = [];
      for (const file of files) {
        const photoData = new FormData();
        photoData.set("file", file);
        const photoResponse = await fetch(`/api/closet-items/${item.id}/photos`, {
          method: "POST",
          body: photoData,
        });
        if (!photoResponse.ok) throw new Error(await getErrorMessage(photoResponse));
        const photo = await photoResponse.json().catch(() => null) as { id?: string } | null;
        if (photo?.id) uploadedPhotoIds.push(photo.id);
      }
      setItems(files.length ? await fetchClothingItems() : (currentItems) => [item, ...currentItems]);
      if (uploadedPhotoIds.length) {
        void (async () => {
          for (const photoId of uploadedPhotoIds) {
            await fetch(`/api/closet-items/${item.id}/photos/${photoId}/standardize`, { method: "POST" }).catch(() => undefined);
          }
          setItems(await fetchClothingItems());
        })();
      }
      if (files.length && analyzeAfterUpload) {
        void fetch(`/api/closet-items/${item.id}/analyze`, { method: "POST" })
          .then(async (analysisResponse) => {
            if (analysisResponse.ok) setItems(await fetchClothingItems());
          })
          .catch(() => {
            // The piece is already saved. AI suggestions can be retried from its detail page.
          });
      }
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save this piece.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setDeletingItemId(id);
    setError(null);
    try {
      const response = await fetch(`/api/closet-items/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setItems((current) => current.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to remove this piece.");
      return false;
    } finally {
      setDeletingItemId(null);
    }
  }, []);

  return { items, isLoading, isSaving, deletingItemId, error, loadItems, createItem, deleteItem };
}
