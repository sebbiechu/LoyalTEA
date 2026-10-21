import Link from "next/link";

export const metadata = { title: "Privacy · LoyalTEA" };

export default function Privacy() {
  return (
    <main>
      <header className="hero" style={{ paddingBottom: 56 }}>
        <img src="/logo-white.png" alt="LoyalTEA" width={1200} height={565} />
      </header>
      <div className="shell lift">
        <article className="card">
          <h2>What LoyalTEA stores</h2>
          <p>LoyalTEA has no accounts. We never ask for your name, email, staff number, phone number or password.</p>
          <p><b>On your phone:</b> a random card code (like <code>7K4Q-9XM2-PB3D</code>) saved in your browser so the page remembers your card.</p>
          <p><b>On our server:</b> that code, plus the date and time of each stamp or free drink and which drink it was. That&apos;s it.</p>
          <p>Nobody can tell from the data who a card belongs to. If the database were ever exposed, it would show anonymous codes and drink counts.</p>
          <h2 style={{ marginTop: 20 }}>Your code is your card</h2>
          <p>Anyone with your code could see or use your stamps, so treat it like a paper card: don&apos;t post it publicly. If you lose it, start a new card; there&apos;s no way to link cards to people, by design.</p>
          <h2 style={{ marginTop: 20 }}>Cookies</h2>
          <p>One strictly necessary cookie holds your card code so it survives browser clean-ups. Staff devices use one sign-in cookie. No tracking or analytics.</p>
          <Link className="btn block" href="/" style={{ marginTop: 8 }}>Back to my card</Link>
        </article>
      </div>
    </main>
  );
}
