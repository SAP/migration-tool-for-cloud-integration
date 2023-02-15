# Frequently Asked Questions (FAQ)

## Registering tenants

**Q: 'Test Connection' succeeds, but 'Get Integration Content' fails?**

**A:** Verify that the oAuth Client has the correct Roles assigned.

**Q: Can I export the connection details of my tenants so the information is not lost when redeploying the database?**

**A:** Yes. In the Register Tenants app, click on 'Save to Tenants.csv file'. This will create a CSV file with the connection details of all your tenants. The CSV file is located in a special folder which is used during the database deploy phase. After saving the file, you can either regenerate the database (cds deploy --to sqlite), or download the file to your laptop (click on 'Download Tenants.csv file').

To also download other information about the tenants (tenant content, migration tasks, migration job logs), use the 'Download db.sqlite file' button.

---

## Exploring tenants

**Q: Analyze Scrips for Env Vars: Error 'end of central directory record signature not found' is shown for an artifact?**

**A:** The unzip process of the specific artifact is not working. You should open the artifact (iFlow) in the Cloud Integration cockpit and manually verify the script files.

**Q: Some Limitations are shown that items are not supported for migration?**

**A:** This tool has limitations, based on the availability of APIs to interact with the integration tenant. For a full list of limitations, see [Limitations](Limitations.md).

We are constantly working on increasing the scope of this tool, and please reach out to us with ideas if you want to contribute.

---

## Configuring Migration Tasks

**Q: The 'In Source' column shows 'No'?**

**A:** This migration task was created when specific items were present on the source tenant. Afterwards this item was removed from the source tenant, and the migration tool had its content refreshed (Get Integration Content). Now the task is out of sync with the available content. As long as the items with 'No' for In Source are not in scope for the migration (skip), you can just continue without issues.

If needed, you can solve this by clicking on 'Reset / Regenerate Content List'. Be aware that this also resets the in and out of scope of each item.

**Q: Can I specify 'Configure Only' for only a subset of the flows in a package?**

**A:** No

**Q: I can't select all tenants as migration target?**

**A:** Make sure the tenant you want to use as a target is not marked as read-only (Source-only system flag set to true in Register Tenants module).