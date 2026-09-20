---
description: Deployment workflow and SSH destination for Hostinger
globs: *
---

# Hostinger Deployment Instructions

Whenever the user asks to deploy to Hostinger:

- **Target App**: BMS-OPD Frontend
- **Domain**: `https://novel.mkinfotrack.com`
- **Hostinger Remote Path**: `/home/u832627210/domains/mkinfotrack.com/public_html/novel`
- **SSH Host & Port**: `147.93.17.56:65002` (User: `u832627210`)
- **Backend API**: `https://bms-opd-be.onrender.com`
- **Deployment Command**:
  1. `cd BMS-opd-fe && npm run build`
  2. `cd .. && node deploy-hostinger.js`
