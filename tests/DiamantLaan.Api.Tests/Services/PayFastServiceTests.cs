using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class PayFastServiceTests
{
    [Fact]
    public void GenerateSignature_ReturnsExpectedHash()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["cancel_url"] = "https://www.example.com/cancel",
            ["notify_url"] = "https://www.example.com/itn",
            ["name_first"] = "Test User",
            ["name_last"] = "Doe",
            ["email_address"] = "test+user@example.com",
            ["m_payment_id"] = "42",
            ["amount"] = "200.00",
            ["item_name"] = "Order#42"
        };

        var signature = PayFastService.GenerateSignature(data, "jt7NOE43FZPn");

        Assert.Equal("a18a81fce9f020f3cc7b901f9b84a5d5", signature);
    }
}
