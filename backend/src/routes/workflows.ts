import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, getAuth } from "@clerk/express";

const router = Router();
const prisma = new PrismaClient();

// Ensure user exists in database
async function ensureUser(userId: string): Promise<string> {
  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId },
    });
  }
  return user.id;
}

// Get all workflows for the current user
router.get("/", requireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const dbUserId = await ensureUser(clerkUserId);
    
    const workflows = await prisma.workflow.findMany({
      where: { userId: dbUserId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// Get a single workflow
router.get("/:id", requireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const dbUserId = await ensureUser(clerkUserId);
    
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        userId: dbUserId,
      },
    });
    
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// Create a new workflow
router.post("/", requireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const dbUserId = await ensureUser(clerkUserId);
    const { name, description, nodes, edges } = req.body;
    
    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Untitled Workflow",
        description: description || null,
        nodes: nodes || [],
        edges: edges || [],
        userId: dbUserId,
      },
    });
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// Update a workflow
router.put("/:id", requireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const dbUserId = await ensureUser(clerkUserId);
    const { name, description, nodes, edges } = req.body;
    
    // Verify ownership
    const existing = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        userId: dbUserId,
      },
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    const workflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        nodes: nodes ?? existing.nodes,
        edges: edges ?? existing.edges,
      },
    });
    
    res.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// Delete a workflow
router.delete("/:id", requireAuth(), async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const dbUserId = await ensureUser(clerkUserId);
    
    // Verify ownership
    const existing = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        userId: dbUserId,
      },
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    // Delete related executions first
    await prisma.workflowExecution.deleteMany({
      where: { workflowId: req.params.id },
    });
    
    await prisma.workflow.delete({
      where: { id: req.params.id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workflow:", error);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

export default router;
