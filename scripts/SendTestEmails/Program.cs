using System.Net.Http.Json;
using System.Text.Json.Serialization;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.Extensions.Configuration;

var recipients = args.Length > 0
    ? args
    : ["fransdk@orania.co.za", "joost@orania.co.za"];
var site = "http://localhost:4200";

var config = new ConfigurationBuilder()
    .AddUserSecrets("e8541e83-4ebb-4b9d-bce2-39f699014081")
    .AddEnvironmentVariables()
    .Build();

var apiKey = config["Mandrill:ApiKey"];
var from = config["Mandrill:FromEmail"];
if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(from))
{
    Console.Error.WriteLine("Mandrill:ApiKey and Mandrill:FromEmail must be set in API user secrets.");
    return 1;
}

var to = recipients.Select(r => new Recipient(r, "to")).ToArray();
SendMessage Mail(string subject, string html) => new(from, "[TEST] " + subject, html, to);

var voorberei = EmailTemplates.BlockStatusUpdate("Stephan", SquareStatus.Voorberei, [12, 13], site)!.Value;
var teer = EmailTemplates.BlockStatusUpdate("Stephan", SquareStatus.BesigOmTeTeer, [12], site)!.Value;
var klaar = EmailTemplates.BlockStatusUpdate("Stephan", SquareStatus.KlaarGeteer, [12, 13, 14], site)!.Value;

var messages = new[]
{
    Mail(EmailTemplates.SubjectPrefix + "Herstel jou wagwoord",
        EmailTemplates.PasswordResetOtp("Stephan", "ABC123")),
    Mail(EmailTemplates.SubjectPrefix + "Jou borgskap is voltooi!",
        EmailTemplates.ManualPurchaseWelcome("Stephan", recipients[0], "TempPass1!", site)),
    Mail(EmailTemplates.SubjectPrefix + "Jou borgskap is voltooi!",
        EmailTemplates.GuestPurchaseClaim(3, 1500, site + "/eis?token=test", 14)),
    Mail(EmailTemplates.SubjectPrefix + "Jou borgskap is voltooi!",
        EmailTemplates.AccountPurchaseConfirmation("Stephan", 2, 1000, site)),
    Mail(voorberei.Subject, voorberei.Html),
    Mail(teer.Subject, teer.Html),
    Mail(klaar.Subject, klaar.Html)
};

// Mandrill has no batch endpoint, so send one POST per message.
using var http = new HttpClient();
var failed = 0;
foreach (var message in messages)
{
    var response = await http.PostAsJsonAsync(
        "https://mandrillapp.com/api/1.0/messages/send.json",
        new SendRequest(apiKey, message));

    if (!response.IsSuccessStatusCode)
    {
        Console.Error.WriteLine($"{message.Subject}: HTTP {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        failed++;
        continue;
    }

    foreach (var result in await response.Content.ReadFromJsonAsync<SendResult[]>() ?? [])
    {
        Console.WriteLine($"{result.Status,-8} {result.Email} {result.Id} {result.RejectReason}");
        if (result.Status is not ("sent" or "queued" or "scheduled")) failed++;
    }
}

Console.WriteLine($"Sent {messages.Length - failed}/{messages.Length} emails to {string.Join(", ", recipients)}.");
return failed == 0 ? 0 : 1;

record SendRequest([property: JsonPropertyName("key")] string Key, [property: JsonPropertyName("message")] SendMessage Message);

record SendMessage(
    [property: JsonPropertyName("from_email")] string FromEmail,
    [property: JsonPropertyName("subject")] string Subject,
    [property: JsonPropertyName("html")] string Html,
    [property: JsonPropertyName("to")] Recipient[] To);

record Recipient([property: JsonPropertyName("email")] string Email, [property: JsonPropertyName("type")] string Type);

record SendResult(
    [property: JsonPropertyName("_id")] string? Id,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("reject_reason")] string? RejectReason);
