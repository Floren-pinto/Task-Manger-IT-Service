import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errorMessage";

describe("getErrorMessage", () => {
  it("prefers the server message", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: { data: { message: "Staff is not allowed to delete client" } },
    };
    expect(getErrorMessage(error, "Gagal.")).toBe(
      "Staff is not allowed to delete client",
    );
  });

  it("replaces the generic axios message with the fallback", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { data: {} },
    };
    expect(getErrorMessage(error, "Gagal menyimpan.")).toBe("Gagal menyimpan.");
  });

  it("keeps messages from errors thrown in the client", () => {
    expect(
      getErrorMessage(new Error("Ukuran file melebihi 5MB."), "Gagal."),
    ).toBe("Ukuran file melebihi 5MB.");
  });

  it("falls back when there is no message at all", () => {
    expect(getErrorMessage(undefined, "Gagal.")).toBe("Gagal.");
  });
});
