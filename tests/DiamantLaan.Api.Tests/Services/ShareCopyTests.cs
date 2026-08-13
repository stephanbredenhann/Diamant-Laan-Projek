using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class ShareCopyTests
{
    [Fact]
    public void Sentence_UsesFirstNameAndSquareMetres()
    {
        Assert.Equal("Jan het 5 m² geborg vir die Oewerpad in Orania!", ShareCopy.Sentence("Jan", 5));
    }

    [Fact]
    public void DisplayName_FallsBackWhenBlank()
    {
        Assert.Equal("Iemand", ShareCopy.DisplayName("  "));
        Assert.Equal("Iemand het 1 m² geborg vir die Oewerpad in Orania!", ShareCopy.Sentence(null, 1));
    }
}
