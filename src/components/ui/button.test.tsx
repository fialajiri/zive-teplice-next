import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Odeslat</Button>);
    expect(screen.getByRole("button", { name: "Odeslat" })).toBeInTheDocument();
  });
});
