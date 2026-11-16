import { Users, Bell, X } from 'lucide-react'

// Shown on the dashboard when the signed-in user belongs to no group yet.
// This is a nudge, not a gate: plenty of people sign up because a roommate
// already keeps the household's group, and those users should wait for an
// invite rather than create a duplicate group. So both paths are offered,
// and the card can be dismissed without creating anything.
export default function NoGroupPrompt({ onCreateGroup, onDismiss })
{
    return (
        <section className="panel no-group-prompt" aria-labelledby="no-group-title">
            <button
                type="button"
                className="no-group-dismiss"
                onClick={onDismiss}
                aria-label="Dismiss this suggestion"
            >
                <X size={18} />
            </button>

            <h2 id="no-group-title">You&rsquo;re not in a group yet</h2>

            <p>
                A group is the household you share chores and items with. You only need one
                per household, so there are two ways to get into yours.
            </p>

            <ul className="no-group-paths">
                <li>
                    <Users size={18} aria-hidden="true" />
                    <div>
                        <strong>Nobody has set yours up</strong>
                        <span>Create the group, then invite your roommates to it.</span>
                    </div>
                </li>
                <li>
                    <Bell size={18} aria-hidden="true" />
                    <div>
                        <strong>A roommate already has one</strong>
                        <span>
                            Ask them to invite you. Their invite arrives under the bell above,
                            and accepting it puts you straight into the household.
                        </span>
                    </div>
                </li>
            </ul>

            <div className="no-group-actions">
                <button type="button" className="btn-primary" onClick={onCreateGroup}>
                    Create a group
                </button>
                <button type="button" className="btn-ghost" onClick={onDismiss}>
                    I&rsquo;m waiting on an invite
                </button>
            </div>

            <p className="hint">
                You can create a group at any time with &ldquo;Create Group&rdquo; in the top bar.
            </p>
        </section>
    )
}
