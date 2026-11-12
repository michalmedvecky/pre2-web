# Retired standalone publishers

These `.disabled` files retain the previous Pre2, Golden Axe and Flappy publishing references. GitHub Actions does not execute files outside `.github/workflows/`. Only `publish-remastered-image.yml` is active: one image contains the portal and all three prefixed games. Do not restore standalone publishers during deployment.

The remote historical Quest VR workflow (ID390230523, source path `publish-vr-image.yml` absent from main) was manually disabled during migration. No live deployment identity is inferred from that workflow record.
