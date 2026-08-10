# FloorPlan Stage Studio

A multi-provider AI virtual staging and 3D floor plan conversion application for real estate professionals.

## Features
- Upload floor plans and convert them to 3D geometry using **FloorplanToBlender3d**
- Render clean, neutral room base views using a headless **Blender** worker
- AI Virtual Staging via multiple swappable providers: **GPT-4o (OpenAI)**, **Imagen (Gemini)**, **FLUX (BFL)**
- Smart room analysis and prompt optimization using **Claude 3.5 Sonnet**
- Project management, client tracking, and cost estimation

## Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**
   Copy \`.env.example\` to \`.env\` and add your API keys:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. **Database Setup**
   The project uses SQLite for simple deployment.
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   \`\`\`

4. **Run Locally (Development)**
   \`\`\`bash
   npm run dev
   \`\`\`
   Access the app at [http://localhost:3000](http://localhost:3000).

## Architecture
- **Frontend/Backend:** Next.js (App Router), Tailwind CSS, Prisma
- **Workers:** Docker Compose orchestrates `floorplan-worker` and `blender-worker`

## Provider Costs (Estimated)
- **GPT Image API:** ~$0.011 - $0.167 / image
- **Gemini Imagen:** ~$0.045 - $0.101 / image
- **FLUX (BFL):** ~$0.014 - $0.07 / image
