import {
  commitFile,
  commitFileDeletion,
  readAgentProposal,
  readRepoFile,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { buildCommitMessage, formatRuleLine, agentBranchFor } from "@/lib/rules"

type RouteParams = { params: Promise<{ id: string }> }

function isValidRuleField(text: unknown): text is string {
  return (
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= 120 &&
    !/[|\r\n]/.test(text)
  )
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: sessionId } = await params
  return respondWithResultOrError(async () => {
    const { when, require } = await request.json()
    if (!isValidRuleField(when) || !isValidRuleField(require)) {
      throw new Error(
        "When and Require must each be one line of up to 120 characters, without |."
      )
    }

    const branch = agentBranchFor(sessionId)
    const { proposedRule } = await readAgentProposal(branch)
    if (!proposedRule) {
      throw new Error("This agent branch has no proposed rule.")
    }

    const editedRuleLine = formatRuleLine({
      ...proposedRule,
      when: when.trim(),
      require: require.trim(),
    })
    const branchRulesFile = await readRepoFile("RULES.md", branch)
    await commitFile(
      "RULES.md",
      branchRulesFile!.text.replace(
        formatRuleLine(proposedRule),
        () => editedRuleLine
      ),
      buildCommitMessage("desk", `edit rule ${proposedRule.id}`),
      branch
    )
    // The preview described the old wording, so it no longer applies.
    await commitFileDeletion(
      `lessons/${proposedRule.id}-impact.json`,
      buildCommitMessage("desk", `clear impact preview for ${proposedRule.id}`),
      branch
    )
    return { rule: editedRuleLine }
  })
}
