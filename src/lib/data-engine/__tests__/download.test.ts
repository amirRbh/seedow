import { describe, expect, it } from "vitest";
import { httpDownload } from "../download.server";

const now = () => "2026-08-14T00:00:00Z";
function fakeFetch(body: string, ok = true): typeof fetch {
  return (async () => ({ ok, text: async () => body })) as unknown as typeof fetch;
}

describe("httpDownload", () => {
  it("télécharge un JSON en RawData sourcée", async () => {
    const raw = await httpDownload("amf_geco", "https://x/opc.json", {
      kind: "json",
      fetchImpl: fakeFetch('{"a":1}'),
      now,
    });
    expect(raw).toEqual({
      sourceKey: "amf_geco",
      sourceUrl: "https://x/opc.json",
      content: '{"a":1}',
      contentType: "json",
      retrievedAt: "2026-08-14T00:00:00Z",
    });
  });

  it("renvoie null sur HTTP non-ok, corps vide, ou dépassement de taille", async () => {
    expect(await httpDownload("s", "u", { fetchImpl: fakeFetch("{}", false), now })).toBeNull();
    expect(await httpDownload("s", "u", { fetchImpl: fakeFetch("   "), now })).toBeNull();
    expect(
      await httpDownload("s", "u", { fetchImpl: fakeFetch("abcdef"), maxBytes: 3, now }),
    ).toBeNull();
  });

  it("ne lève jamais : une erreur réseau devient null (§17)", async () => {
    const boom = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(await httpDownload("s", "u", { fetchImpl: boom, now })).toBeNull();
  });
});
