import { createPeer, createWorkerTransport } from "@nodomics/rpc";
import { serveMockEngine } from "./mock-engine.ts";

serveMockEngine(createPeer(createWorkerTransport(self)));
