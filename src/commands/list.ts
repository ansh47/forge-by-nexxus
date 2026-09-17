import pc from "picocolors";
import { listTemplates } from "../templates.js";

export async function listCommand(): Promise<void> {
  const templates = await listTemplates();

  if (templates.length === 0) {
    console.log(pc.yellow("No templates found. Add one under templates/<id>/."));
    return;
  }

  console.log(pc.bold("\nAvailable templates:\n"));
  for (const t of templates) {
    console.log(`  ${pc.cyan(t.id.padEnd(24))} ${t.name}`);
    console.log(`  ${" ".repeat(24)} ${pc.dim(t.description)}\n`);
  }
  console.log(pc.dim(`Run "forge create <template-id>" to use one.\n`));
}
