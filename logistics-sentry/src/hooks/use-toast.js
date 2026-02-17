"use client";
import * as React from "react";

export function toast({ title, description }) {
    console.log(`[Toast] ${title}: ${description}`);
    // Simple implementation for now, can be expanded with a real context/portal
    const event = new CustomEvent("toast", { detail: { title, description } });
    window.dispatchEvent(event);
}

export function useToast() {
    return { toast };
}
