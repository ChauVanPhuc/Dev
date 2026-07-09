import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9102;
const HOST = process.env.HOST || '0.0.0.0';
const OLLAMA_API = process.env.OLLAMA_API || 'http://localhost:11434';
const HISTORY_FILE = path.join(__dirname, 'history.json');

// Helper to normalize model names for robust comparison
function normalizeModelName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/:latest$/, '');
}

// Get standardized options for a model to ensure Ollama uses the exact same runner settings,
// avoiding model reloading when transitioning from preloading to chatting.
function getModelOptions(modelName) {
  const normName = normalizeModelName(modelName);
  const isLargeModel = /(\b[7-9]b\b|:7b|:8b|:13b|:14b|:32b|:70b)/.test(normName);
  if (isLargeModel) {
<truncated 12278 bytes>