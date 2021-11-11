# Frequently Asked Questions (FAQ)

## Connectivity to tenants

**Q: 'Test Connection' succeeds, but 'Get Integration Content' fails**

**A:** Verify that the oAuth Client has the correct Roles assigned.

---

## Exploring tenants

**Q: 'Test Connection' succeeds, but 'Get Integration Content' fails**

**A:** Verify that the oAuth Client has the correct Roles assigned.

**Q: Analyze Scrips for Env Vars: Error 'end of central directory record signature not found' is shown for an artifact**

**A:** The unzip process of the specific artifact is not working. You should open the artifact (iFlow) in the Cloud Integration cockpit and manually verify the script files.

**Q: Some Limitations are shown that items are not supported for migration**

**A:**
This tool has limitations, based on the availability of APIs to interact with the integration tenant. We are constantly working on increasing the scope of this tool, and please reach out to us with ideas if you want to contribute.

---

## Configuring Migration Tasks

**Q: The In Source columns shows 'No'**

**A:** This migration task was created when specific items were present on the source tenant. Afterwards this item was removed from the source tenant, and the migration tool had its content refreshed (Get Integration Content). Now the task is out of sync with the available content. As long as the items with 'No' for In Source are not in scope for the migration, you can just continue without issues.

If needed, you can solve this by clicking on 'Reset / Regenerate Content List'. Be aware that this also resets the in and out of scope of each item.

**Q: Can I specify 'Configure Only' for only a subset of the flows in a package**

**A:** No
