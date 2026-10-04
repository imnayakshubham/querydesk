import Link from "next/link"

export const metadata = { title: "About · QueryDesk" }

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function AboutPage() {
  return (
    <article className="flex max-w-2xl flex-col gap-8 leading-relaxed">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">About QueryDesk</h1>
        <p className="text-muted-foreground">
          A workbench for a hospital&apos;s insurance desk, where an AI
          assistant prepares the work and a person makes every decision.
        </p>
      </div>

      <Section title="The problem">
        <p>
          When a patient with cashless insurance is ready to go home, the
          hospital sends the claim to the insurer. Often the insurer writes back
          with a query: &ldquo;Why was the patient in the ICU? Send a
          justification.&rdquo; The patient waits while the desk finds the
          document and replies.
        </p>
        <p>
          The same insurers ask the same questions again and again. What each
          insurer usually asks for lives in people&apos;s heads, so the desk
          keeps answering queries it could have prevented.
        </p>
      </Section>

      <Section title="What QueryDesk does">
        <ul className="list-disc pl-5">
          <li>
            Checks a claim against the desk&apos;s rulebook before it is sent.
          </li>
          <li>Drafts a reply when an insurer sends a query.</li>
          <li>
            Turns an answered query into a new rule, so the next patient&apos;s
            claim includes the document from the start.
          </li>
          <li>
            Lets the desk undo a rule when an insurer stops asking for it.
          </li>
        </ul>
      </Section>

      <Section title="Who does what">
        <p>
          <strong>The assistant</strong> reads the claim, checks it, drafts
          replies and suggests rules. It always shows which rule it relied on.
        </p>
        <p>
          <strong>You</strong> review its work. Nothing the assistant writes
          counts until you approve it, and you can reject or reword anything.
        </p>
        <p>
          <strong>The assistant never</strong> contacts an insurer, sends a
          claim, decides whether treatment was medically necessary, or changes
          the desk&apos;s protected rules.
        </p>
      </Section>

      <Section title="Everything is on record">
        <p>
          Every action is saved as a numbered, dated change, like tracked
          changes in a document. The assistant&apos;s work is kept apart until
          you approve it. Each claim has a timeline, and the Rules page shows
          who added, rejected or removed every rule. Removing a rule is itself a
          recorded change, so nothing is ever lost.
        </p>
      </Section>

      <Section title="Try it yourself">
        <ol className="list-decimal pl-5">
          <li>
            Open the{" "}
            <Link href="/" className="text-primary underline">
              Queue
            </Link>{" "}
            and click <strong>CLM-001</strong>, Mr. Ramesh Kulkarni, who had
            dengue and two days in the ICU.
          </li>
          <li>
            Click <strong>Check claim</strong>. The assistant confirms his
            papers match the rulebook.
          </li>
          <li>
            Back on the Queue, click <strong>Simulate insurer query</strong> for
            CLM-001. The insurer asks why he was in the ICU.
          </li>
          <li>
            On his claim, click <strong>Draft reply</strong>, read it, and click{" "}
            <strong>Approve</strong>.
          </li>
          <li>
            Click <strong>Propose lesson</strong>. On the{" "}
            <Link href="/rules" className="text-primary underline">
              Rules
            </Link>{" "}
            page, read the suggested rule, click <strong>Preview impact</strong>{" "}
            to see which other patients it would affect, then{" "}
            <strong>Approve</strong> it.
          </li>
          <li>
            Open <strong>CLM-002</strong>, Mrs. Anita Deshmukh, and click{" "}
            <strong>Check claim</strong>. The new rule flags the missing ICU
            note before the insurer can ask.
          </li>
          <li>
            On the Rules page, click <strong>Revert</strong> on the new rule,
            then check CLM-002 again. The note is no longer asked for.
          </li>
        </ol>
        <p className="text-muted-foreground">
          The assistant takes up to a minute per step. If it says it is busy or
          has reached its limit, try again a little later.
        </p>
      </Section>

      <Section title="Good to know">
        <ul className="list-disc pl-5">
          <li>
            All patients, insurers and claims are invented. No real data is
            used.
          </li>
          <li>
            This is a shared demo: someone else may have just approved or
            removed a rule. Every step can be repeated.
          </li>
        </ul>
      </Section>
    </article>
  )
}
