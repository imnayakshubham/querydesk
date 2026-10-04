import { readFile, readSessionProposal, writeFile } from "@/lib/github"
import { respondWithJson } from "@/lib/respond"
import { commitMessage, formatRule, sessionBranchName } from "@/lib/rules"

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
  return respondWithJson(async () => {
    const { when, require } = await request.json()
    if (!isValidRuleField(when) || !isValidRuleField(require)) {
      throw new Error(
        "When and Require must each be one line of up to 120 characters, without |."
      )
    }

    const branch = sessionBranchName(sessionId)
    const { proposedRule } = await readSessionProposal(branch)
    if (!proposedRule) throw new Error("This session has no proposed rule.")

    const editedRuleLine = formatRule({
      ...proposedRule,
      when: when.trim(),
      require: require.trim(),
    })
    const branchRulesFile = await readFile("RULES.md", branch)
    await writeFile(
      "RULES.md",
      branchRulesFile!.text.replace(
        formatRule(proposedRule),
        () => editedRuleLine
      ),
      commitMessage("desk", `edit rule ${proposedRule.id}`),
      branch
    )
    // The preview described the old wording, so it no longer applies.
    await writeFile(
      `lessons/${proposedRule.id}-impact.json`,
      null,
      commitMessage("desk", `clear impact preview for ${proposedRule.id}`),
      branch
    )
    return { rule: editedRuleLine }
  })
}
