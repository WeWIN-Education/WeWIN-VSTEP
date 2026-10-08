FROM clamav/clamav:stable
# Keep this service private; mount a Railway volume at /var/lib/clamav.
EXPOSE 3310
