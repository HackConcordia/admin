import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connect = vi.fn();
vi.mock("mongoose", () => ({ default: { connect } }));

const URI = "mongodb://admin:hunter2@example.invalid/hackathon";

async function loadConnectMongoDB() {
  vi.resetModules();
  return (await import("@/repository/mongoose")).default;
}

describe("connectMongoDB", () => {
  beforeEach(() => {
    connect.mockReset();
    delete (globalThis as { mongooseConnectionCache?: unknown }).mongooseConnectionCache;
    vi.stubEnv("MONGODB_URI", URI);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("connects once with command buffering disabled, for concurrent and later calls", async () => {
    connect.mockResolvedValue({});
    const connectMongoDB = await loadConnectMongoDB();

    await Promise.all([connectMongoDB(), connectMongoDB(), connectMongoDB()]);
    await connectMongoDB();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(URI, expect.objectContaining({ bufferCommands: false }));
  });

  it("keeps the connection across module reloads (dev hot reload, separately bundled routes)", async () => {
    connect.mockResolvedValue({});
    await (await loadConnectMongoDB())();
    await (await loadConnectMongoDB())();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("waits for an in-flight connection instead of returning early", async () => {
    let finish: () => void = () => {};
    connect.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const connectMongoDB = await loadConnectMongoDB();

    let settled = false;
    const pending = connectMongoDB().then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);

    finish();
    await pending;
    expect(settled).toBe(true);
  });

  it("retries on the next call after a failed connection", async () => {
    connect.mockRejectedValueOnce(new Error("server selection timed out")).mockResolvedValueOnce({});
    const connectMongoDB = await loadConnectMongoDB();

    await expect(connectMongoDB()).rejects.toThrow("MongoDB connection failed");
    await expect(connectMongoDB()).resolves.toBeUndefined();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("never logs or rethrows the connection URI when connecting fails", async () => {
    const failure = Object.assign(new Error(`getaddrinfo ENOTFOUND for ${URI}`), { name: "MongoServerSelectionError", code: 8000 });
    connect.mockRejectedValueOnce(failure);
    const connectMongoDB = await loadConnectMongoDB();

    const thrown = await connectMongoDB().catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("MongoDB connection failed: MongoServerSelectionError");
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("(code: 8000)");
    expect(logged).not.toContain("hunter2");
  });

  it("fails fast without connecting when MONGODB_URI is not set", async () => {
    vi.stubEnv("MONGODB_URI", "");
    const connectMongoDB = await loadConnectMongoDB();

    await expect(connectMongoDB()).rejects.toThrow("MONGODB_URI");
    expect(connect).not.toHaveBeenCalled();
  });
});
