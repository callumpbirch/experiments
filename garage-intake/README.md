# Garage intake demo

[Open demo](https://htmlpreview.github.io/?https://github.com/callumpbirch/experiments/blob/9d62a3303a6d446ec77b35d24a855bba26f54961/garage-intake/index.html).

No setup. Alternatively download index.html and open it in a browser.

The Škoda example is ready to send. Answer the short follow-ups, continue with the sample contact details and send the request. Use Garage to review the three concerns and propose a next step. Notification demonstrates returning to the conversation.

Everything is saved only in the same browser. This demonstrates both sides on one device; it does not share data between customers and garages. Notifications are simulated. No messages, bookings or payments are sent.

The replaceable IntakeProvider inside index.html uses deterministic rules and conservative mock answers. It is not a live model or mechanical diagnosis. The app has no runtime dependencies, server, database or account setup. GitHub Actions checks the intake logic and browser journey automatically.
