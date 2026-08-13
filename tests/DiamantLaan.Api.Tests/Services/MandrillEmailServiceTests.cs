using System.Net;
using System.Text;
using System.Text.Json;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class MandrillEmailServiceTests
{
    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly string _responseJson;
        public string? CapturedBody { get; private set; }
        public Uri? CapturedUri { get; private set; }

        public StubHandler(string responseJson) => _responseJson = responseJson;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedUri = request.RequestUri;
            CapturedBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_responseJson, Encoding.UTF8, "application/json")
            };
        }
    }

    private static MandrillEmailService Create(StubHandler handler, string apiKey = "md-key", string from = "noreply@example.com") =>
        new(new HttpClient(handler),
            Options.Create(new MandrillSettings { ApiKey = apiKey, FromEmail = from }),
            NullLogger<MandrillEmailService>.Instance);

    [Fact]
    public async Task SendAsync_PostsMandrillPayload_AndReturnsTrueWhenSent()
    {
        var handler = new StubHandler("""[{"_id":"abc","email":"koper@example.com","status":"sent"}]""");

        var ok = await Create(handler).SendAsync("koper@example.com", "Onderwerp", "<p>Hallo</p>");

        Assert.True(ok);
        Assert.Equal("https://mandrillapp.com/api/1.0/messages/send.json", handler.CapturedUri!.ToString());

        var root = JsonDocument.Parse(handler.CapturedBody!).RootElement;
        Assert.Equal("md-key", root.GetProperty("key").GetString());
        var message = root.GetProperty("message");
        Assert.Equal("noreply@example.com", message.GetProperty("from_email").GetString());
        Assert.Equal("Onderwerp", message.GetProperty("subject").GetString());
        Assert.Equal("<p>Hallo</p>", message.GetProperty("html").GetString());
        var recipient = message.GetProperty("to")[0];
        Assert.Equal("koper@example.com", recipient.GetProperty("email").GetString());
        Assert.Equal("to", recipient.GetProperty("type").GetString());
    }

    [Fact]
    public async Task SendAsync_ReturnsFalse_WhenMandrillRejects()
    {
        var handler = new StubHandler("""[{"email":"koper@example.com","status":"rejected","reject_reason":"hard-bounce"}]""");

        Assert.False(await Create(handler).SendAsync("koper@example.com", "Onderwerp", "<p>Hallo</p>"));
    }

    [Fact]
    public async Task SendAsync_ReturnsFalse_AndSkipsCall_WhenNotConfigured()
    {
        var handler = new StubHandler("[]");

        Assert.False(await Create(handler, apiKey: "").SendAsync("koper@example.com", "Onderwerp", "<p>Hallo</p>"));
        Assert.Null(handler.CapturedUri);
    }
}
