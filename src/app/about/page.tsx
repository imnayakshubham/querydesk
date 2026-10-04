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
    <article className="flex flex-col gap-8 leading-relaxed">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">About QueryDesk</h1>
        <p className="text-muted-foreground">
          An AI assistant does the legwork on insurance claims. You stay in
          charge of every decision.
        </p>
      </div>

      <Section title="Why this exists">
        <p>
          When a patient with cashless insurance is about to go home, the
          hospital sends the claim to the insurer. Often the insurer writes back
          with a question, like &ldquo;Why was the patient in the ICU?&rdquo;
          Until the desk finds the right document and replies, the patient
          waits.
        </p>
        <p>
          The frustrating part is that insurers ask the same questions again and
          again. The desk knows what each insurer usually wants, but that
          knowledge sits in people&apos;s heads. QueryDesk writes it down as
          rules, so next time the right document goes out before anyone asks.
        </p>
      </Section>

      <Section title="What you can do here">
        <ul className="list-disc pl-5">
          <li>
            Check a claim before it goes out, to see if anything is missing.
          </li>
          <li>Get a reply drafted when an insurer sends a question.</li>
          <li>
            Turn that question into a new rule, so the next claim already has
            the document.
          </li>
          <li>Remove a rule when an insurer stops asking for it.</li>
        </ul>
      </Section>

      <Section title="Who does what">
        <p>
          <strong>The assistant</strong> reads the claim, checks it, writes
          drafts and suggests rules. It always tells you which rule it used.
        </p>
        <p>
          <strong>You</strong> look at what it did and decide. Nothing it writes
          counts until you approve it, and you can reword or throw away
          anything.
        </p>
        <p>
          <strong>The assistant never</strong> talks to an insurer, sends a
          claim, decides whether a treatment was medically needed, or touches
          the desk&apos;s protected rules.
        </p>
      </Section>

      <Section title="Nothing gets lost">
        <p>
          Every action is saved as a dated change, a bit like tracked changes in
          a document. The assistant&apos;s work is kept to one side until you
          approve it. Each claim has its own timeline, and the Rules page shows
          who added, rejected or removed every rule. Even removing a rule is
          saved as a change, so you can always see what was undone and when.
        </p>
      </Section>

      <Section title="Try it yourself">
        <ol className="list-decimal pl-5">
          <li>
            Go to the{" "}
            <Link href="/" className="text-primary underline">
              Queue
            </Link>{" "}
            and open <strong>CLM-001</strong>. That&apos;s Mr. Ramesh Kulkarni,
            who had dengue and spent two days in the ICU.
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
            Open his claim again, click <strong>Draft reply</strong>, read it,
            and click <strong>Approve</strong>.
          </li>
          <li>
            Click <strong>Propose lesson</strong>, then go to{" "}
            <Link href="/rules" className="text-primary underline">
              Rules
            </Link>
            . Read the suggested rule, click <strong>Preview impact</strong> to
            see which other patients it would affect, and{" "}
            <strong>Approve</strong> it.
          </li>
          <li>
            Open <strong>CLM-002</strong>, Mrs. Anita Deshmukh, and click{" "}
            <strong>Check claim</strong>. The new rule catches the missing ICU
            note before the insurer can ask.
          </li>
          <li>
            On the Rules page, click <strong>Revert</strong> on the new rule,
            then check CLM-002 again. The note isn&apos;t asked for anymore.
          </li>
        </ol>
        <p className="text-muted-foreground">
          Each assistant step can take up to a minute. If it says it&apos;s busy
          or has hit its limit, give it a little while and try again.
        </p>
      </Section>

      <Section title="Good to know">
        <ul className="list-disc pl-5">
          <li>
            Every patient, insurer and claim here is made up. No real data is
            used.
          </li>
          <li>
            Other people may be trying the demo too, so someone might have just
            approved or removed a rule. You can repeat any step.
          </li>
        </ul>
      </Section>
    </article>
  )
}
