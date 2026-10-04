import { DeskError } from "@/lib/desk-error"
import {
  commitFile,
  commitFileDeletion,
  readAgentProposal,
  readRulebook,
} from "@/lib/github"
import { respondWithResultOrError } from "@/lib/respond"
import { agentBranchFor, buildCommitMessage, formatRuleLine } from "@/lib/rules"

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
      throw new DeskError(
        "When and Require must each be one line of up to 120 characters, without |."
      )
    }

    const branch = agentBranchFor(sessionId)
    const { proposedRule } = await readAgentProposal(branch)
    if (!proposedRule) {
      throw new DeskError("This agent branch has no proposed rule.")
    }

    const proposedLine = formatRuleLine(proposedRule)
    const editedLine = formatRuleLine({
      ...proposedRule,
      when: when.trim(),
      require: require.trim(),
    })
    const branchRulebookLines = (await readRulebook(branch)).split("\n")
    await commitFile(
      "RULES.md",
      branchRulebookLines
        .map((line) => (line === proposedLine ? editedLine : line))
        .join("\n"),
      buildCommitMessage("desk", `edit rule ${proposedRule.id}`),
      branch
    )
    // The preview described the old wording, so it no longer applies.
    await commitFileDeletion(
      `lessons/${proposedRule.id}-impact.json`,
      buildCommitMessage("desk", `clear impact preview for ${proposedRule.id}`),
      branch
    )
    return { rule: editedLine }
  })
}
